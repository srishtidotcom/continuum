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
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="continuum-panel space-y-4 rounded-[var(--radius-soft)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories... (try 'What am I working on?')"
            className="min-w-0 flex-1 rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] px-3 py-2 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-faint)] focus:border-[color:var(--color-border-strong)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-[var(--radius-soft)] bg-[color:var(--color-text)] px-4 py-2 text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {viewMode === 'search' && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] px-4 py-2 text-sm text-[color:var(--color-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Options */}
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2 text-[color:var(--color-muted)]">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
              className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-2 py-1 text-[color:var(--color-text)] focus:outline-none"
            >
              <option value="keyword">Keyword</option>
              <option value="semantic">Semantic</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          {searchType !== 'keyword' && (
            <label className="flex items-center gap-2 text-[color:var(--color-muted)]">
              Threshold:
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-20 accent-[color:var(--color-accent)]"
              />
              <span className="text-[color:var(--color-faint)]">{threshold.toFixed(1)}</span>
            </label>
          )}
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="rounded-[var(--radius-soft)] border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {viewMode === 'search' && (
        <div className="space-y-3">
          {loading && (
            <div className="py-4 text-center text-sm text-[color:var(--color-faint)]">
              Searching {searchType} index...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-8 text-center text-sm text-[color:var(--color-faint)]">
              No results found for "{query}"
            </div>
          )}

          {results.map((result: SearchResult) => (
            <div key={result.id} className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 hover:border-[color:var(--color-border-strong)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-faint)]">
                    {new Date(result.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-[color:var(--color-text)]">{result.text}</div>
                </div>

                {/* Similarity Badge */}
                {result.similarity !== undefined && (
                  <div className="flex-shrink-0 text-right">
                    <div className="mb-1 text-xs text-[color:var(--color-faint)]">Relevance</div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-soft)] bg-white/[0.035]">
                      <span className="text-sm font-semibold text-[color:var(--color-muted)]">
                        {Math.round(result.similarity * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {result.half_baked && (
                <div className="mt-4 inline-block rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)] px-3 py-1 text-xs text-[color:var(--color-muted)]">
                  Half-baked
                </div>
              )}
            </div>
          ))}

          {!loading && results.length > 0 && (
            <div className="py-2 text-center text-xs text-[color:var(--color-faint)]">
              Found {results.length} result{results.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
