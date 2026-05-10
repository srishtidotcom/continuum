import { NextResponse } from 'next/server'
import { serverSupabase } from '../../../lib/serverSupabase'
import { getUserIdFromRequest } from '../../../lib/auth'

type GroupedMemories = Record<string, any[]>
type MemoryRow = {
  id: string
  text: string
  half_baked: boolean
  metadata: Record<string, unknown>
  created_at: string
  discovery_hint?: {
    related_memory_id: string
    similarity: number
    days_ago: number
    snippet: string
  }
}

/**
 * Format date to "YYYY-MM-DD" for grouping
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Group memories by date (newest first)
 */
function groupMemoriesByDate(memories: any[]): GroupedMemories {
  const grouped: GroupedMemories = {}

  memories.forEach((mem) => {
    const dateStr = formatDate(new Date(mem.created_at))
    if (!grouped[dateStr]) {
      grouped[dateStr] = []
    }
    grouped[dateStr].push(mem)
  })

  // Sort groups by date descending (newest first)
  const sorted: GroupedMemories = {}
  Object.keys(grouped)
    .sort()
    .reverse()
    .forEach((key) => {
      sorted[key] = grouped[key]
    })

  return sorted
}

/**
 * GET /api/memories
 * 
 * Query params:
 * - limit: number of memories per page (default 20, max 100)
 * - offset: pagination offset (default 0)
 * - groupBy: "date" (default) | "none" — whether to group by date in response
 * 
 * Returns:
 * {
 *   ok: true,
 *   data: {
 *     "2025-05-10": [ { id, text, half_baked, metadata, created_at }, ... ],
 *     "2025-05-09": [ ... ],
 *     ...
 *   },
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limitStr = url.searchParams.get('limit') ?? '20'
    const offsetStr = url.searchParams.get('offset') ?? '0'
    const groupBy = url.searchParams.get('groupBy') ?? 'date'

    let limit = Math.min(parseInt(limitStr, 10) || 20, 100)
    let offset = Math.max(parseInt(offsetStr, 10) || 0, 0)

    // Extract user id from JWT
    let userId = await getUserIdFromRequest(request)
    if (!userId) userId = request.headers.get('x-user-id') || process.env.LOCAL_USER_ID || null

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch total count for pagination metadata
    const { count: totalCount, error: countErr } = await serverSupabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countErr) {
      console.error('Count error:', countErr)
      return NextResponse.json(
        { ok: false, error: countErr.message },
        { status: 500 }
      )
    }

    // Fetch memories ordered by created_at DESC (newest first)
    const { data: memoryRows, error: memErr } = await serverSupabase
      .from('memories')
      .select('id, text, half_baked, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (memErr) {
      console.error('Fetch error:', memErr)
      return NextResponse.json(
        { ok: false, error: memErr.message },
        { status: 500 }
      )
    }

    const memories = (memoryRows || []) as MemoryRow[]

    // Compute discovery hints (search a larger recent window and use a higher similarity threshold)
    try {
      const SEARCH_WINDOW = 200

      // Fetch a larger window of recent memories (ids, text, created_at)
      const { data: recentMemories, error: recentErr } = await serverSupabase
        .from('memories')
        .select('id, text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(SEARCH_WINDOW)

      if (!recentErr && recentMemories && recentMemories.length > 0) {
        const recentIds = recentMemories.map((m: any) => m.id)

        const { data: embeds, error: embedErr } = await serverSupabase
          .from('memory_embeddings')
          .select('memory_id, embedding')
          .in('memory_id', recentIds)

        if (!embedErr && embeds) {
          const embedMap: Record<string, number[]> = {}
          for (const e of embeds) {
            embedMap[e.memory_id] = e.embedding
          }

          // helper functions
          const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0)
          const norm = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0))
          const cosine = (a: number[], b: number[]) => {
            if (!a || !b) return 0
            const nd = dot(a, b)
            const nn = norm(a) * norm(b)
            return nn === 0 ? 0 : nd / nn
          }
          const daysBetween = (a: string, b: string) => {
            const da = new Date(a)
            const db = new Date(b)
            const diff = Math.abs(da.getTime() - db.getTime())
            return Math.round(diff / (1000 * 60 * 60 * 24))
          }

          // Use a higher similarity threshold for stricter matches
          const SIM_THRESHOLD = 0.9

          // For each memory in the current page, find the most similar earlier memory from the larger window
          for (const mem of memories) {
            const embA = embedMap[mem.id]
            if (!embA) continue

            let best: { id: string; sim: number; snippet: string; days: number } | null = null

            for (const cand of recentMemories) {
              if (cand.id === mem.id) continue
              // only consider older memories (created_at earlier than current memory)
              if (new Date(cand.created_at) >= new Date(mem.created_at)) continue
              const embB = embedMap[cand.id]
              if (!embB) continue
              const sim = cosine(embA, embB)
              if (!best || sim > best.sim) {
                best = { id: cand.id, sim, snippet: (cand.text || '').slice(0, 240), days: daysBetween(mem.created_at, cand.created_at) }
              }
            }

            if (best && best.sim >= SIM_THRESHOLD) {
              mem.discovery_hint = {
                related_memory_id: best.id,
                similarity: best.sim,
                days_ago: best.days,
                snippet: best.snippet
              }
            }
          }
        }
      }
    } catch (hintErr) {
      console.error('Discovery hint computation failed:', hintErr)
    }

    // Format response
    let data: any
    if (groupBy === 'date') {
      data = groupMemoriesByDate(memories || [])
    } else {
      data = memories || []
    }

    return NextResponse.json({
      ok: true,
      data,
      total: totalCount || 0,
      limit,
      offset
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
