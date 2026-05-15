"use client"

import { useState, useRef, useEffect } from 'react'
import { useToast } from '../lib/useToast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  relevantMemories?: Array<{
    id: string
    text: string
    created_at: string
    similarity: number
  }>
  timestamp?: string
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }
    setMessages((prev) => [...prev, userMessage])
    
    const userInput = input
    setInput('')
    setLoading(true)

    try {
      // Call streaming endpoint with stream=true
      const res = await fetch('/api/chat?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''}`
        },
        body: JSON.stringify({ message: userInput })
      })

      if (!res.ok) {
        throw new Error(`Chat failed: ${res.statusText}`)
      }

      // Handle Server-Sent Events stream
      const reader = res.body?.getReader()
      if (!reader) {
        throw new Error('No readable stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data)

              if (event.type === 'metadata') {
                // Update message with relevant memories
                assistantMessage.relevantMemories = event.relevantMemories
                assistantMessage.timestamp = event.timestamp
              } else if (event.type === 'text') {
                // Append text chunk to message
                assistantMessage.content += event.content
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastMsg = updated[updated.length - 1]
                  if (lastMsg?.role === 'assistant') {
                    updated[updated.length - 1] = { ...assistantMessage }
                  } else {
                    updated.push({ ...assistantMessage })
                  }
                  return updated
                })
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch (parseErr) {
              console.error('Failed to parse stream event:', parseErr)
            }
          }
        }
      }

      // Ensure final message is added
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.role === 'assistant' && lastMsg.content) {
          return prev
        }
        return [...prev, assistantMessage]
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      
      // Show specific error messages for different failure types
      if (errorMsg.includes('timeout')) {
        addToast('Request timed out. Please try again.', 'error', 6000)
      } else if (errorMsg.includes('Failed to retrieve memories')) {
        addToast('Could not retrieve memories. Semantic search may not be available.', 'error', 6000)
      } else if (errorMsg.includes('Gemini')) {
        addToast('Gemini API error. Please try again.', 'error', 6000)
      } else {
        addToast(errorMsg, 'error', 6000)
      }
      
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="continuum-panel flex h-full flex-col overflow-hidden rounded-[var(--radius-soft)]">
      {/* Messages Container */}
      <div className="continuum-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[color:var(--color-faint)]">
              <p className="font-display mb-2 text-2xl text-[color:var(--color-muted)]">Reflect with Continuum</p>
              <p className="text-xs leading-5">
                Try: "What have I been thinking about lately?" or "Find recurring themes"
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white/[0.035] text-xs text-[color:var(--color-muted)]">
                C
              </div>
            )}

            <div
              className={`max-w-lg ${
                msg.role === 'user'
                  ? 'rounded-[var(--radius-soft)] bg-[color:var(--color-text)] p-3 text-[color:var(--color-bg)]'
                  : 'rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] p-3 text-[color:var(--color-text)]'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Relevant Memories Section */}
              {msg.relevantMemories && msg.relevantMemories.length > 0 && (
                <div className="mt-3 border-t border-[color:var(--color-border)] pt-3 text-xs">
                  <p className="mb-2 font-medium text-[color:var(--color-faint)]">Referenced memories:</p>
                  <div className="space-y-1">
                    {msg.relevantMemories.slice(0, 3).map((mem) => (
                      <div
                        key={mem.id}
                        className="line-clamp-2 cursor-pointer text-[color:var(--color-faint)] hover:text-[color:var(--color-muted)]"
                        title={mem.text}
                      >
                        <span className="text-[color:var(--color-faint)]">
                          {new Date(mem.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {' — '}
                        <span>{mem.text.substring(0, 60)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 text-xs text-[color:var(--color-faint)]">
                {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-xs font-bold text-[color:var(--color-bg)]">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white/[0.035] text-xs text-[color:var(--color-muted)]">
              C
            </div>
            <div className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] p-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-faint)]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-faint)]" style={{ animationDelay: '0.1s' }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-faint)]" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-[color:var(--color-border)] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your memories... (e.g., 'What have I been thinking about?')"
            className="min-w-0 flex-1 rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] px-3 py-2 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-faint)] focus:border-[color:var(--color-border-strong)] focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-[var(--radius-soft)] bg-[color:var(--color-text)] px-4 py-2 text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>
    </div>
  )
}
