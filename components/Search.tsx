"use client"

import { useState, useCallback } from 'react'
import { useSearchMemories, SearchType, SearchResult } from '../lib/useMemories'

type ViewMode = 'memories' | 'search'

export default function SearchComponent() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('hybrid')
  const [threshold, setThreshold] = useState(0.5)
  const [viewMode, setViewMode] = useState<ViewMode>('memories')

  const { results, loading, error, search, clearResults } = useSearchMemories()

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
        setViewMode('search')
        search(query, searchType, 20, threshold)
      }
    },
    [query, searchType, threshold, search]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    clearResults()
    setViewMode('memories')
  }, [clearResults])

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories... (try 'What am I working on?')"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-white text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {viewMode === 'search' && (
            <button
              type="button"
              onClick={handleClear}
              className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded text-sm hover:bg-zinc-700 transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Options */}
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-2 text-zinc-400">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300 focus:outline-none"
            >
              <option value="keyword">Keyword</option>
              <option value="semantic">Semantic</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          {searchType !== 'keyword' && (
            <label className="flex items-center gap-2 text-zinc-400">
              Threshold:
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-zinc-500">{threshold.toFixed(1)}</span>
            </label>
          )}
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-900 border border-red-700 rounded text-sm text-red-100">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {viewMode === 'search' && (
        <div className="space-y-3">
          {loading && (
            <div className="py-4 text-center text-zinc-500 text-sm">
              Searching {searchType} index...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-4 text-center text-zinc-600 text-sm">
              No results found for "{query}"
            </div>
          )}

          {results.map((result: SearchResult) => (
            <div key={result.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-zinc-500">
                    {new Date(result.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed">{result.text}</div>
                </div>

                {/* Similarity Badge */}
                {result.similarity !== undefined && (
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-zinc-500 mb-1">Relevance</div>
                    <div className="flex items-center justify-center w-12 h-12 bg-zinc-800 rounded">
                      <span className="text-sm font-semibold text-zinc-300">
                        {Math.round(result.similarity * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {result.half_baked && (
                <div className="mt-2 inline-block px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400">
                  Half-baked
                </div>
              )}
            </div>
          ))}

          {!loading && results.length > 0 && (
            <div className="py-2 text-center text-zinc-600 text-xs">
              Found {results.length} result{results.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
