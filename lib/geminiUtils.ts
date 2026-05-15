/**
 * Shared Gemini utilities for text generation and embeddings.
 */

import { GEMINI_CONFIG, GEMINI_MODELS } from './constants'

const DEFAULT_TIMEOUT_MS = 30000
const EMBEDDING_TIMEOUT_MS = 20000
const CHAT_TIMEOUT_MS = 60000
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export type GeminiEmbeddingTaskType =
  | 'SEMANTIC_SIMILARITY'
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT'

interface EmbeddingResponse {
  embedding: number[] | null
  error?: string
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function geminiHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  }
}

function buildGenerationBody(
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number
) {
  return {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  }
}

export async function generateEmbedding(
  text: string,
  apiKey: string,
  taskType: GeminiEmbeddingTaskType = 'SEMANTIC_SIMILARITY'
): Promise<EmbeddingResponse> {
  if (!apiKey) {
    return { embedding: null, error: 'Gemini API key not configured' }
  }

  try {
    const response = await fetchWithTimeout(
      `${GEMINI_API_BASE}/models/${GEMINI_MODELS.EMBEDDING}:embedContent`,
      {
        method: 'POST',
        headers: geminiHeaders(apiKey),
        body: JSON.stringify({
          model: `models/${GEMINI_MODELS.EMBEDDING}`,
          content: {
            parts: [{ text }]
          },
          taskType,
          outputDimensionality: GEMINI_CONFIG.EMBEDDING_DIMENSIONS
        }),
        timeout: EMBEDDING_TIMEOUT_MS
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini embedding API error:', errorText)
      return {
        embedding: null,
        error: `Gemini API error: ${response.status}`
      }
    }

    const data = await response.json()
    const embedding = data?.embedding?.values

    if (!embedding || !Array.isArray(embedding)) {
      console.error('Invalid embedding response from Gemini:', data)
      return {
        embedding: null,
        error: 'Invalid embedding response'
      }
    }

    return { embedding }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Embedding generation failed:', message)
    return {
      embedding: null,
      error: message
    }
  }
}

export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 500
): Promise<{ response: string | null; error?: string }> {
  if (!apiKey) {
    return { response: null, error: 'Gemini API key not configured' }
  }

  try {
    const response = await fetchWithTimeout(
      `${GEMINI_API_BASE}/models/${GEMINI_MODELS.CHAT}:generateContent`,
      {
        method: 'POST',
        headers: geminiHeaders(apiKey),
        body: JSON.stringify(buildGenerationBody(systemPrompt, userMessage, temperature, maxTokens)),
        timeout: CHAT_TIMEOUT_MS
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini chat API error:', errorText)
      return {
        response: null,
        error: `Gemini API error: ${response.status}`
      }
    }

    const data = await response.json()
    const content = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim()

    if (!content) {
      console.error('No response content from Gemini:', data)
      return {
        response: null,
        error: 'No valid response from Gemini'
      }
    }

    return { response: content }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Chat generation failed:', message)
    return {
      response: null,
      error: message
    }
  }
}

export async function streamChatResponse(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 500
): Promise<{ response: Response | null; error?: string }> {
  if (!apiKey) {
    return { response: null, error: 'Gemini API key not configured' }
  }

  try {
    const response = await fetchWithTimeout(
      `${GEMINI_API_BASE}/models/${GEMINI_MODELS.CHAT}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: geminiHeaders(apiKey),
        body: JSON.stringify(buildGenerationBody(systemPrompt, userMessage, temperature, maxTokens)),
        timeout: CHAT_TIMEOUT_MS
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini stream API error:', errorText)
      return {
        response: null,
        error: `Gemini API error: ${response.status}`
      }
    }

    return { response }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Chat stream failed:', message)
    return {
      response: null,
      error: message
    }
  }
}
