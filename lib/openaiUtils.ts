/**
 * Shared OpenAI utilities to prevent duplication across API routes
 */

const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds for most calls
const EMBEDDING_TIMEOUT_MS = 20000 // 20 seconds for embeddings (faster)
const CHAT_TIMEOUT_MS = 60000 // 60 seconds for chat (slower)

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

interface EmbeddingResponse {
  embedding: number[] | null
  error?: string
}

/**
 * Generate embedding for text using OpenAI text-embedding-3-small
 * Shared utility used by /api/input, /api/search, /api/chat
 * 
 * @param text - Text to embed
 * @param apiKey - OpenAI API key
 * @returns embedding vector or error message
 */
export async function generateEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
  if (!apiKey) {
    return { embedding: null, error: 'OpenAI API key not configured' }
  }

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      }),
      timeout: EMBEDDING_TIMEOUT_MS
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI embedding API error:', errorText)
      return {
        embedding: null,
        error: `OpenAI API error: ${response.status}`
      }
    }

    const data = await response.json()
    const embedding = data?.data?.[0]?.embedding

    if (!embedding || !Array.isArray(embedding)) {
      console.error('Invalid embedding response from OpenAI:', data)
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

/**
 * Call OpenAI Chat API for conversational reflection
 * Used by /api/chat endpoint
 */
export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 500
): Promise<{ response: string | null; error?: string }> {
  if (!apiKey) {
    return { response: null, error: 'OpenAI API key not configured' }
  }

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature,
        max_tokens: maxTokens
      }),
      timeout: CHAT_TIMEOUT_MS
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI chat API error:', errorText)
      return {
        response: null,
        error: `OpenAI API error: ${response.status}`
      }
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      console.error('No response content from OpenAI:', data)
      return {
        response: null,
        error: 'No valid response from OpenAI'
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

/**
 * Call OpenAI Whisper API for audio transcription
 * Used by /api/transcribe endpoint
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<{ text: string | null; error?: string }> {
  if (!apiKey) {
    return { text: null, error: 'OpenAI API key not configured' }
  }

  try {
    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer], { type: mimeType }), fileName)
    formData.append('model', 'whisper-1')

    const response = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData,
      timeout: CHAT_TIMEOUT_MS // Whisper can be slow
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Whisper API error:', errorData)
      return {
        text: null,
        error: `Whisper API error: ${response.status}`
      }
    }

    const data = await response.json()
    const text = data?.text

    if (!text) {
      console.error('No transcription returned from Whisper:', data)
      return {
        text: null,
        error: 'No transcription generated'
      }
    }

    return { text }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Transcription failed:', message)
    return {
      text: null,
      error: message
    }
  }
}
