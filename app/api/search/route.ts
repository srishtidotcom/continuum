import { NextResponse } from 'next/server'
import { serverSupabase } from '../../../lib/serverSupabase'
import { generateEmbedding } from '../../../lib/openaiUtils'
import { getOpenAIApiKey } from '../../../lib/envValidation'
import { logger } from '../../../lib/logger'
import { extractUserId } from '../../../lib/authUtils'
import {
  API_ROUTES,
  DB_TABLES,
  RPC_FUNCTIONS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  SEARCH_TYPES,
  SIMILARITY_THRESHOLDS,
  PAGINATION
} from '../../../lib/constants'

type SearchType = (typeof SEARCH_TYPES)[keyof typeof SEARCH_TYPES]

interface SearchRequest {
  query: string
  type?: SearchType
  limit?: number
  threshold?: number
}

/**
 * POST /api/search
 * 
 * Body:
 * {
 *   query: string (required),
 *   type: "keyword" | "semantic" | "hybrid" (default: "hybrid"),
 *   limit: number (default: 20, max: 100),
 *   threshold: number (default: 0.5, only for semantic) — cosine similarity threshold
 * }
 * 
 * Returns:
 * {
 *   ok: true,
 *   query: string,
 *   type: SearchType,
 *   results: [
 *     {
 *       id: uuid,
 *       text: string,
 *       half_baked: boolean,
 *       metadata: object,
 *       created_at: string,
 *       similarity?: number (only for semantic/hybrid)
 *     }
 *   ],
 *   count: number
 * }
 */
export async function POST(request: Request) {
  try {
    const body: SearchRequest = await request.json()
    const { query, type = SEARCH_TYPES.HYBRID, limit = PAGINATION.DEFAULT_LIMIT, threshold = SIMILARITY_THRESHOLDS.SEMANTIC_SEARCH } = body

    if (!query || !query.trim()) {
      logger.warn('POST /api/search: empty query')
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.EMPTY_QUERY },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Extract user ID from JWT, header, or env
    const userId = await extractUserId(request)

    if (!userId) {
      logger.warn('POST /api/search: unauthorized')
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    logger.logApiStart('POST', API_ROUTES.SEARCH, userId)

    const actualLimit = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT)
    const sanitizedQuery = query.trim()

    let results: any[] = []

    if (type === SEARCH_TYPES.KEYWORD) {
      results = await keywordSearch(userId, sanitizedQuery, actualLimit)
    } else if (type === SEARCH_TYPES.SEMANTIC) {
      results = await semanticSearch(userId, sanitizedQuery, actualLimit, threshold)
    } else if (type === SEARCH_TYPES.HYBRID) {
      // Hybrid: combine keyword and semantic results, deduplicate
      const keywordResults = await keywordSearch(userId, sanitizedQuery, actualLimit)
      const semanticResults = await semanticSearch(userId, sanitizedQuery, actualLimit, threshold)

      const resultMap = new Map()

      // Add semantic results first (higher quality due to similarity ranking)
      semanticResults.forEach((r) => {
        resultMap.set(r.id, r)
      })

      // Add keyword results (fill gaps, deduplicate by ID)
      keywordResults.forEach((r) => {
        if (!resultMap.has(r.id)) {
          resultMap.set(r.id, r)
        }
      })

      results = Array.from(resultMap.values()).slice(0, actualLimit)
    }

    logger.logApiSuccess('POST', API_ROUTES.SEARCH, HTTP_STATUS.OK)
    return NextResponse.json({
      ok: true,
      query: sanitizedQuery,
      type,
      results,
      count: results.length
    })
  } catch (err) {
    logger.logApiError('POST', API_ROUTES.SEARCH, err as Error)
    return NextResponse.json(
      { ok: false, error: ERROR_MESSAGES.DATABASE_ERROR },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    )
  }
}

/**
 * Keyword search: simple text search using ILIKE (PostgreSQL case-insensitive)
 */
async function keywordSearch(userId: string, query: string, limit: number): Promise<any[]> {
  const searchPattern = `%${query}%`

  const { data, error } = await serverSupabase
    .from(DB_TABLES.MEMORIES)
    .select('id, text, half_baked, metadata, created_at')
    .eq('user_id', userId)
    .ilike('text', searchPattern)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Keyword search error:', error)
    return []
  }

  return data || []
}

/**
 * Semantic search: use pgvector cosine similarity
 * 
 * Steps:
 * 1. Generate embedding for the query via OpenAI
 * 2. Query memory_embeddings table using cosine similarity (<-> operator)
 * 3. Join with memories and return results
 */
async function semanticSearch(
  userId: string,
  query: string,
  limit: number,
  threshold: number
): Promise<any[]> {
  try {
    // Step 1: Generate query embedding
    const openaiKey = getOpenAIApiKey()
    if (!openaiKey) {
      logger.warn('Semantic search skipped: OpenAI key not configured')
      return []
    }

    const { embedding: queryEmbedding, error: embError } = await generateEmbedding(
      query,
      openaiKey
    )

    if (embError || !queryEmbedding) {
      logger.logExternalApi('OpenAI', 'embeddings', false, embError)
      return []
    }

    logger.logExternalApi('OpenAI', 'embeddings', true)

    // Step 2: Query using RPC for pgvector similarity search
    const { data, error } = await serverSupabase.rpc(RPC_FUNCTIONS.SEARCH_MEMORIES, {
      query_embedding: queryEmbedding,
      user_id_param: userId,
      similarity_threshold: threshold,
      match_limit: limit
    })

    if (error) {
      // If RPC doesn't exist, fall back to no results
      logger.logDb('RPC', RPC_FUNCTIONS.SEARCH_MEMORIES, false, error)
      return []
    }

    logger.logDb('RPC', RPC_FUNCTIONS.SEARCH_MEMORIES, true)
    return data || []
  } catch (err) {
    logger.error('Semantic search exception', { error: err })

    return []
  }
}
