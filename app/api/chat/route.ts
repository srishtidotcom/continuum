import { NextResponse } from 'next/server'
import { serverSupabase } from '../../../lib/serverSupabase'
import { generateEmbedding, generateChatResponse, streamChatResponse } from '../../../lib/geminiUtils'
import { getGeminiApiKey } from '../../../lib/envValidation'
import { logger } from '../../../lib/logger'
import { extractUserId } from '../../../lib/authUtils'
import {
  API_ROUTES,
  DB_TABLES,
  RPC_FUNCTIONS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  PAGINATION,
  CHAT_CONFIG
} from '../../../lib/constants'
import { ChatRequest } from '../../../lib/chatTypes'

/**
 * POST /api/chat
 * 
 * Conversational Reflection: Ask questions about your memory history.
 * The system retrieves relevant memories using embeddings and uses LLM to generate contextual responses.
 * 
 * Body:
 * {
 *   message: string (required) — user's question/query,
 *   limit?: number (default: 10) — number of relevant memories to retrieve for context
 * }
 * 
 * Returns:
 * {
 *   ok: true,
 *   message: string — the LLM response,
 *   relevantMemories: Array<{
 *     id: uuid,
 *     text: string,
 *     created_at: string,
 *     similarity: number
 *   }> — memories used for context,
 *   conversationId?: string — optional conversation ID for future grouping
 * }
 */
export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json()
    const { message, limit = PAGINATION.DEFAULT_CHAT_LIMIT } = body

    if (!message || !message.trim()) {
      logger.warn('POST /api/chat: empty message')
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.EMPTY_TEXT },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Extract user ID from JWT, header, or env
    const userId = await extractUserId(request)

    if (!userId) {
      logger.warn('POST /api/chat: unauthorized')
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    logger.logApiStart('POST', API_ROUTES.CHAT, userId)

    // Step 1: Verify Gemini is available
    const geminiKey = getGeminiApiKey()
    if (!geminiKey) {
      logger.error('POST /api/chat: Gemini API key not configured', {
        userId
      })
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.GEMINI_NOT_CONFIGURED },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      )
    }

    // Step 2: Generate embedding for the user's message
    const { embedding: messageEmbedding, error: embError } = await generateEmbedding(
      message,
      geminiKey,
      'RETRIEVAL_QUERY'
    )

    if (embError || !messageEmbedding) {
      logger.logExternalApi('Gemini', 'embeddings', false, embError)
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.EMBEDDING_FAILED },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      )
    }

    logger.logExternalApi('Gemini', 'embeddings', true)

    // Step 3: Retrieve relevant memories using semantic search (threshold: 0.3 for more context)
    const { data: relevantMemories, error: searchErr } = await serverSupabase.rpc(
      RPC_FUNCTIONS.SEARCH_MEMORIES,
      {
        query_embedding: messageEmbedding,
        user_id_param: userId,
        similarity_threshold: CHAT_CONFIG.CONTEXT_THRESHOLD,
        match_limit: Math.min(limit, PAGINATION.MAX_CHAT_RESULTS)
      }
    )

    if (searchErr) {
      logger.logDb('RPC', RPC_FUNCTIONS.SEARCH_MEMORIES, false, searchErr)
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.MEMORY_RETRIEVAL_FAILED },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      )
    }

    logger.logDb('RPC', RPC_FUNCTIONS.SEARCH_MEMORIES, true)

    // Step 4: Build context from retrieved memories
    const memoryContext = (relevantMemories || [])
      .map((mem: any) => `[${mem.created_at.split('T')[0]}] ${mem.text}`)
      .join('\n\n')

    // Step 5: Call Gemini with context
    const systemPrompt = `You are Continuum, a conversational memory assistant. You help users reflect on their thoughts, ideas, and memories.

When answering questions, reference specific memories and timestamps when relevant. Be conversational, insightful, and help the user discover patterns, connections, and insights from their memory history.

Here are the user's relevant memories:

${memoryContext || 'No relevant memories found.'}

Answer the user's question thoughtfully, drawing from these memories while being direct and concise.`

    // Step 6: Check query parameter for streaming mode
    const url = new URL(request.url)
    const stream = url.searchParams.get('stream') === 'true'

    if (stream) {
      // Streaming mode: Send the response as a stream using Server-Sent Events
      const encoder = new TextEncoder()

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Send event: metadata (relevant memories)
            const metadataEvent = {
              type: 'metadata',
              relevantMemories: (relevantMemories || []).map((mem: any) => ({
                id: mem.id,
                text: mem.text,
                created_at: mem.created_at,
                similarity: mem.similarity
              })),
              timestamp: new Date().toISOString()
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadataEvent)}\n\n`))

            const { response: streamRes, error: streamError } = await streamChatResponse(
              systemPrompt,
              message,
              geminiKey,
              CHAT_CONFIG.TEMPERATURE,
              CHAT_CONFIG.MAX_TOKENS
            )

            if (streamError || !streamRes) {
              logger.logExternalApi('Gemini', 'streamGenerateContent', false, streamError)
              const errorEvent = {
                type: 'error',
                message: 'Failed to stream response'
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
              controller.close()
              return
            }

            logger.logExternalApi('Gemini', 'streamGenerateContent', true)

            const reader = streamRes.body?.getReader()
            if (!reader) {
              const errorEvent = {
                type: 'error',
                message: 'No readable stream'
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
              controller.close()
              return
            }

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') continue

                  try {
                    const json = JSON.parse(data)
                    const chunk = json.candidates?.[0]?.content?.parts
                      ?.map((part: { text?: string }) => part.text || '')
                      .join('')

                    if (chunk) {
                      const streamEvent = {
                        type: 'text',
                        content: chunk
                      }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamEvent)}\n\n`))
                    }
                  } catch (e) {
                    logger.error('Failed to parse stream chunk', { error: e })
                  }
                }
              }
            }

            controller.close()
          } catch (err) {
            logger.error('Stream error', { error: err })
            const errorEvent = {
              type: 'error',
              message: String(err)
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
            controller.close()
          }
        }
      })

      logger.logApiSuccess('POST', API_ROUTES.CHAT, HTTP_STATUS.OK)
      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    const { response, error: chatError } = await generateChatResponse(
      systemPrompt,
      message,
      geminiKey,
      CHAT_CONFIG.TEMPERATURE,
      CHAT_CONFIG.MAX_TOKENS
    )

    if (chatError || !response) {
      logger.logExternalApi('Gemini', 'generateContent', false, chatError)
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.CHAT_GENERATION_FAILED },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      )
    }

    logger.logExternalApi('Gemini', 'generateContent', true)

    // Non-streaming mode: Return response as JSON (legacy)
    logger.logApiSuccess('POST', API_ROUTES.CHAT, HTTP_STATUS.OK)
    return NextResponse.json({
      ok: true,
      message: response,
      relevantMemories: (relevantMemories || []).map((mem: any) => ({
        id: mem.id,
        text: mem.text,
        created_at: mem.created_at,
        similarity: mem.similarity
      })),
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    logger.logApiError('POST', API_ROUTES.CHAT, err as Error)
    return NextResponse.json(
      { ok: false, error: ERROR_MESSAGES.DATABASE_ERROR },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    )
  }
}
