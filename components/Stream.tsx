"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useMemories, GroupedMemories, Memory } from '../lib/useMemories'
import { useToast } from '../lib/useToast'

export default function Stream() {
  const { memories, loading, error, hasMore, total, fetchMemories, loadMore } = useMemories()
  const { addToast } = useToast()
  const scrollEndRef = useRef<HTMLDivElement>(null)

  // Load initial memories
  useEffect(() => {
    fetchMemories(0, 20, 'date')
  }, [fetchMemories])

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      addToast(`Failed to load memories: ${error}`, 'error', 6000)
    }
  }, [error, addToast])

  // Infinite scroll handler
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore(20, 'date')
        }
      },
      { threshold: 0.1 }
    )

    if (scrollEndRef.current) {
      observer.observe(scrollEndRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  const memoryCount = (Object.values(memories) as Memory[][]).reduce((sum, group) => sum + group.length, 0)

  return (
    <div className="space-y-6">
      {memoryCount === 0 && !loading && (
        <div className="text-center py-8 text-zinc-500">
          No memories yet. Start capturing your thoughts!
        </div>
      )}

      {/* Render grouped memories by date */}
      {(Object.entries(memories) as Array<[string, Memory[]]>).map(([date, items]) => (
        <div key={date}>
          {/* Date header */}
          <div className="sticky top-0 py-2 mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-950/95 backdrop-blur">
            {formatDateHeader(date)}
          </div>

          {/* Memory items for this date */}
          <div className="space-y-3">
            {items.map((memory: Memory) => (
              <div key={memory.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition">
                <div className="text-xs text-zinc-500">
                  {new Date(memory.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="mt-2 text-sm leading-relaxed">{memory.text}</div>
                {memory.discovery_hint && (
                  <div className="mt-3 p-2 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-zinc-400">Related thought from {memory.discovery_hint.days_ago} days ago</div>
                      <a
                        href={`/memories?focus=${memory.discovery_hint.related_memory_id}`}
                        className="text-xs text-indigo-300 hover:underline"
                      >
                        Open related
                      </a>
                    </div>
                    <div className="mt-1 text-sm leading-tight text-zinc-200">{memory.discovery_hint.snippet}</div>
                  </div>
                )}
                {memory.half_baked && (
                  <div className="mt-2 inline-block px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400">
                    Half-baked
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Loading state */}
      {loading && (
        <div className="py-4 text-center">
          <div className="inline-flex gap-1">
            <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Infinite scroll trigger (IntersectionObserver) */}
      <div ref={scrollEndRef} className="py-4" />

      {/* Load More Button (manual pagination fallback) */}
      {hasMore && !loading && memoryCount > 0 && (
        <div className="py-4 text-center">
          <button
            onClick={() => loadMore(20, 'date')}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded text-sm text-zinc-100 transition"
          >
            Load More
          </button>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && memoryCount > 0 && (
        <div className="py-4 text-center text-zinc-600 text-sm">
          Showing all {total} memories
        </div>
      )}
    </div>
  )
}

/**
 * Format date for header display
 * Examples: "Today", "Yesterday", "May 9, 2025"
 */
function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date.toISOString().split('T')[0] + 'T00:00:00Z')
  const todayOnly = new Date(today.toISOString().split('T')[0] + 'T00:00:00Z')
  const yesterdayOnly = new Date(yesterday.toISOString().split('T')[0] + 'T00:00:00Z')

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}
