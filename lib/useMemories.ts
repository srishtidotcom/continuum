'use client'

import { useState, useCallback } from 'react'

export type Memory = {
  id: string
  text: string
  half_baked: boolean
  metadata: Record<string, any>
  created_at: string
  discovery_hint?: {
    related_memory_id: string
    similarity: number
    days_ago: number
    snippet: string
  }
}

export type GroupedMemories = Record<string, Memory[]>

export type SearchResult = Memory & {
  similarity?: number
}

export type SearchType = 'keyword' | 'semantic' | 'hybrid'

interface MemoriesResponse {
  ok: boolean
  data: GroupedMemories | Memory[]
  total: number
  limit: number
  offset: number
}

interface SearchResponse {
  ok: boolean
  query: string
  type: SearchType
  results: SearchResult[]
  count: number
}

/**
 * Hook to fetch paginated memories from /api/memories
 */
export function useMemories() {
  const [memories, setMemories] = useState<GroupedMemories>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const fetchMemories = useCallback(
    async (pageOffset = 0, limit = 20, groupBy: 'date' | 'none' = 'date') => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(pageOffset),
          groupBy
        })

        const res = await fetch(`/api/memories?${params}`, {
          headers: {
            'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''}`
          }
        })

        if (!res.ok) {
          throw new Error(`Failed to fetch memories: ${res.statusText}`)
        }

        const data: MemoriesResponse = await res.json()

        if (data.ok) {
          setMemories(groupBy === 'date' ? (data.data as GroupedMemories) : { all: data.data as Memory[] })
          setTotal(data.total)
          setOffset(pageOffset + limit)
          setHasMore(pageOffset + limit < data.total)
        } else {
          throw new Error('API returned ok: false')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadMore = useCallback(
    async (limit = 20, groupBy: 'date' | 'none' = 'date') => {
      await fetchMemories(offset, limit, groupBy)
    },
    [offset, fetchMemories]
  )

  return { memories, loading, error, total, hasMore, fetchMemories, loadMore }
}

/**
 * Hook to search memories
 */
export function useSearchMemories() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (query: string, type: SearchType = 'hybrid', limit = 20, threshold = 0.5) => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''}`
          },
          body: JSON.stringify({ query, type, limit, threshold })
        })

        if (!res.ok) {
          throw new Error(`Search failed: ${res.statusText}`)
        }

        const data: SearchResponse = await res.json()

        if (data.ok) {
          setResults(data.results)
        } else {
          throw new Error('API returned ok: false')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return { results, loading, error, search, clearResults }
}
