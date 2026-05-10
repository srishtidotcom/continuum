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
      } else if (errorMsg.includes('OpenAI')) {
        addToast('OpenAI API error. Please try again.', 'error', 6000)
      } else {
        addToast(errorMsg, 'error', 6000)
      }
      
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black rounded-lg border border-zinc-800">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-600">
              <p className="mb-2">Ask Continuum about your memories...</p>
              <p className="text-xs text-zinc-700">
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
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-xs">
                C
              </div>
            )}

            <div
              className={`max-w-lg ${
                msg.role === 'user'
                  ? 'bg-white text-black rounded-lg p-3'
                  : 'bg-zinc-900 text-zinc-100 rounded-lg p-3 border border-zinc-800'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Relevant Memories Section */}
              {msg.relevantMemories && msg.relevantMemories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-700 text-xs">
                  <p className="text-zinc-500 mb-2 font-medium">Referenced memories:</p>
                  <div className="space-y-1">
                    {msg.relevantMemories.slice(0, 3).map((mem) => (
                      <div
                        key={mem.id}
                        className="text-zinc-600 hover:text-zinc-400 transition line-clamp-2 cursor-pointer"
                        title={mem.text}
                      >
                        <span className="text-zinc-700">
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

              <div className="mt-2 text-xs text-zinc-600">
                {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 text-xs text-black font-bold">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-xs">
              C
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your memories... (e.g., 'What have I been thinking about?')"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-700 text-white"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-white text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 transition"
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>
    </div>
  )
}
