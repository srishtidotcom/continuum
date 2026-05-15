import { NextResponse } from 'next/server'
import { serverSupabase } from '../../../lib/serverSupabase'
import { extractTasksFromMemory, detectTaskKeywords } from '../../../lib/taskExtraction'
import { generateEmbedding } from '../../../lib/geminiUtils'
import { getGeminiApiKey } from '../../../lib/envValidation'
import { logger } from '../../../lib/logger'
import { extractUserId } from '../../../lib/authUtils'
import { API_ROUTES, DB_TABLES, ERROR_MESSAGES, HTTP_STATUS } from '../../../lib/constants'
import { validateTaskResponse } from '../../../lib/taskValidation'

interface Body {
  text: string
  halfBaked?: boolean
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const body: Body = await request.json()
    const { text, halfBaked = false, metadata = {} } = body

    if (!text || !text.trim()) {
      logger.warn('Empty memory text submitted')
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.EMPTY_TEXT },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Extract user ID from JWT, header, or env
    const userId = await extractUserId(request)

    if (!userId) {
      logger.warn('POST /api/input missing user ID')
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    logger.logApiStart('POST', API_ROUTES.INPUT, userId)

    // 1) ALWAYS persist memory first (don't cascade failure)
    const { data: mem, error: memErr } = await serverSupabase
      .from(DB_TABLES.MEMORIES)
      .insert([{ user_id: userId, text, half_baked: halfBaked, metadata }])
      .select()
      .single()

    if (memErr) {
      logger.logDb('INSERT', DB_TABLES.MEMORIES, false, memErr)
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.DATABASE_ERROR },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      )
    }

    logger.logDb('INSERT', DB_TABLES.MEMORIES, true)
    let embeddingError: string | null = null

    // 2) Try to create embedding (non-blocking failure)
    const geminiKey = getGeminiApiKey()
    if (geminiKey && mem?.id) {
      const { embedding: emb, error: embError } = await generateEmbedding(text, geminiKey, 'RETRIEVAL_DOCUMENT')
      
      if (embError) {
        logger.logExternalApi('Gemini', 'embeddings', false, embError)
        embeddingError = embError
      } else if (emb) {
        logger.logExternalApi('Gemini', 'embeddings', true)
        
        // 3) Persist embedding if available
        const { error: embDbErr } = await serverSupabase
          .from(DB_TABLES.MEMORY_EMBEDDINGS)
          .insert([{ memory_id: mem.id, embedding: emb }])
        
        if (embDbErr) {
          logger.logDb('INSERT', DB_TABLES.MEMORY_EMBEDDINGS, false, embDbErr)
          embeddingError = ERROR_MESSAGES.EMBEDDING_FAILED
        } else {
          logger.logDb('INSERT', DB_TABLES.MEMORY_EMBEDDINGS, true)
        }
      }
    }

    // 4) Improved task extraction using NLP (non-blocking)
    let taskError: string | null = null
    if (geminiKey && detectTaskKeywords(text)) {
      try {
        const rawTasks = await extractTasksFromMemory(text, geminiKey)
        // Validate task response before using
        const extractedTasks = validateTaskResponse(rawTasks)

        // Save extracted tasks to database
        for (const task of extractedTasks) {
          const { error: taskErr } = await serverSupabase
            .from(DB_TABLES.TASKS)
            .insert([
              {
                user_id: userId,
                memory_id: mem.id,
                title: task.title,
                due_date: task.due_date?.toISOString() || null,
                completed: false
              }
            ])
          if (taskErr) {
            logger.logDb('INSERT', DB_TABLES.TASKS, false, taskErr)
            taskError = 'Some tasks may not have been extracted'
          }
        }
      } catch (err) {
        logger.error('Task extraction failed', { error: err, userId })
        taskError = 'Failed to extract tasks'
      }
    }

    logger.logApiSuccess('POST', API_ROUTES.INPUT, HTTP_STATUS.OK)
    
    // Return success with warnings if any non-blocking operations failed
    return NextResponse.json({
      ok: true,
      id: mem.id,
      warnings: [embeddingError, taskError].filter(Boolean)
    })
  } catch (err) {
    logger.logApiError('POST', API_ROUTES.INPUT, err as Error)
    return NextResponse.json(
      { ok: false, error: ERROR_MESSAGES.DATABASE_ERROR },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    )
  }
}
