import { NextResponse } from 'next/server'
import { serverSupabase } from '../../../lib/serverSupabase'
import { getUserIdFromRequest } from '../../../lib/auth'

/**
 * GET /api/tasks
 * 
 * Retrieve all tasks for the user with optional filtering.
 * 
 * Query params:
 * - completed: boolean (filter by completion status)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * 
 * Returns:
 * {
 *   ok: true,
 *   tasks: Array<{
 *     id: uuid,
 *     title: string,
 *     due_date?: string,
 *     completed: boolean,
 *     memory_id?: uuid,
 *     created_at: string
 *   }>,
 *   total: number
 * }
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const completed = url.searchParams.get('completed')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)

    let userId = await getUserIdFromRequest(request)
    if (!userId) userId = request.headers.get('x-user-id') || process.env.LOCAL_USER_ID || null

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build query
    let query = serverSupabase
      .from('tasks')
      .select('id, title, due_date, completed, memory_id, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Filter by completion if specified
    if (completed !== null) {
      query = query.eq('completed', completed === 'true')
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: tasks, count: total, error } = await query

    if (error) {
      console.error('Get tasks error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      tasks: tasks || [],
      total: total || 0
    })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
