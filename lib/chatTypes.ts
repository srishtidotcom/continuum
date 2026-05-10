/**
 * Chat response types with full type safety
 * Replaces `any` types used throughout chat functionality
 */

/**
 * Single memory reference in chat context
 */
export interface ChatMemoryReference {
  id: string
  text: string
  created_at: string
  similarity: number
}

/**
 * Single chat message in conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  relevantMemories?: ChatMemoryReference[]
  timestamp?: string
}

/**
 * Chat request payload
 */
export interface ChatRequest {
  message: string
  limit?: number
}

/**
 * Chat response payload
 */
export interface ChatResponse {
  ok: boolean
  message?: string
  relevantMemories?: ChatMemoryReference[]
  timestamp?: string
  error?: string
  conversationId?: string
}

/**
 * Server-sent event types for streaming chat
 */
export type ChatStreamEvent =
  | {
      type: 'metadata'
      relevantMemories: ChatMemoryReference[]
      timestamp: string
    }
  | {
      type: 'text'
      content: string
    }
  | {
      type: 'error'
      message: string
    }

/**
 * Type guard to validate if object is a ChatStreamEvent
 */
export function isChatStreamEvent(value: unknown): value is ChatStreamEvent {
  if (!value || typeof value !== 'object') {
    return false
  }

  const event = value as Record<string, unknown>

  if (event.type === 'metadata') {
    return (
      Array.isArray(event.relevantMemories) &&
      typeof event.timestamp === 'string'
    )
  }

  if (event.type === 'text') {
    return typeof event.content === 'string'
  }

  if (event.type === 'error') {
    return typeof event.message === 'string'
  }

  return false
}

/**
 * Parse and validate JSON from LLM chat response
 * @param jsonString - Raw JSON string from LLM
 * @returns Parsed object or null if invalid
 */
export function validateChatResponse(jsonString: string): ChatResponse | null {
  try {
    const parsed = JSON.parse(jsonString)

    // Basic validation of structure
    if (typeof parsed !== 'object' || !parsed) {
      console.warn('Invalid chat response: not an object')
      return null
    }

    // Validate required fields
    if (typeof parsed.message !== 'string') {
      console.warn('Invalid chat response: missing message field')
      return null
    }

    return {
      ok: parsed.ok === true,
      message: parsed.message,
      relevantMemories: Array.isArray(parsed.relevantMemories)
        ? parsed.relevantMemories
        : undefined,
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : undefined
    }
  } catch (error) {
    console.error('Failed to parse chat response:', error, jsonString)
    return null
  }
}
