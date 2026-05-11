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
    <div className="space-y-10">
      {memoryCount === 0 && !loading && (
        <div className="py-14 text-center">
          <p className="font-display text-3xl font-medium text-[color:var(--color-muted)]">
            Your stream is still quiet.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[color:var(--color-faint)]">
            Start with whatever is already in your head. Continuum will keep the thread.
          </p>
        </div>
      )}

      {/* Render grouped memories by date */}
      {(Object.entries(memories) as Array<[string, Memory[]]>).map(([date, items]) => (
        <div key={date} className="relative">
          {/* Date header */}
          <div className="sticky top-0 z-10 mb-4 bg-[rgba(8,8,7,0.82)] py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-faint)] backdrop-blur-xl">
            {formatDateHeader(date)}
          </div>

          {/* Memory items for this date */}
          <div className="space-y-3 border-l border-[color:var(--color-border)] pl-5">
            {items.map((memory: Memory) => (
              <div key={memory.id} className="group relative rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur hover:border-[color:var(--color-border-strong)]">
                <span className="absolute -left-[27px] top-6 h-3 w-3 rounded-full border border-[color:var(--color-accent)]/40 bg-[color:var(--color-bg)] shadow-[0_0_0_5px_var(--color-bg)]" />
                <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-faint)]">
                  {new Date(memory.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="mt-3 text-[15px] leading-7 text-[color:var(--color-text)]">{memory.text}</div>
                {memory.discovery_hint && (
                  <div className="mt-4 rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] p-3 text-xs text-[color:var(--color-muted)]">
                    <div className="flex items-center justify-between gap-2">
                      <div>Related thought from {memory.discovery_hint.days_ago} days ago</div>
                      <a
                        href={`/memories?focus=${memory.discovery_hint.related_memory_id}`}
                        className="text-xs text-[color:var(--color-accent)] hover:text-[color:var(--color-text)]"
                      >
                        Open related
                      </a>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[color:var(--color-text)]">{memory.discovery_hint.snippet}</div>
                  </div>
                )}
                {memory.half_baked && (
                  <div className="mt-4 inline-block rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)] px-3 py-1 text-xs text-[color:var(--color-muted)]">
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
            <div className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-faint)]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-faint)]" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-faint)]" style={{ animationDelay: '0.2s' }}></div>
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
            className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] px-6 py-2 text-sm text-[color:var(--color-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)]"
          >
            Load More
          </button>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && memoryCount > 0 && (
        <div className="py-4 text-center text-sm text-[color:var(--color-faint)]">
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
