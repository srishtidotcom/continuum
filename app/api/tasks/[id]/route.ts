import { NextRequest, NextResponse } from 'next/server'
import { serverSupabase } from '../../../../lib/serverSupabase'
import { extractUserId } from '../../../../lib/authUtils'

interface UpdateTaskBody {
  completed?: boolean
  title?: string
  due_date?: string
}

/**
 * PATCH /api/tasks/:id
 * 
 * Update a specific task (mark as complete, change title, set due date)
 * 
 * Body:
 * {
 *   completed?: boolean,
 *   title?: string,
 *   due_date?: string (ISO 8601 format)
 * }
 * 
 * Returns:
 * {
 *   ok: true,
 *   task: { id, title, due_date, completed, created_at }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: 'Task ID required' },
        { status: 400 }
      )
    }

    const userId = await extractUserId(request)

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: UpdateTaskBody = await request.json()
    const { completed, title, due_date } = body

    // Build update object
    const updateData: any = {}
    if (completed !== undefined) updateData.completed = completed
    if (title !== undefined) updateData.title = title
    if (due_date !== undefined) updateData.due_date = due_date

    // Verify task belongs to user before updating
    const { data: task, error: getErr } = await serverSupabase
      .from('tasks')
      .select('id, user_id')
      .eq('id', taskId)
      .single()

    if (getErr || !task) {
      return NextResponse.json(
        { ok: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    if (task.user_id !== userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update task
    const { data: updatedTask, error: updateErr } = await serverSupabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      task: updatedTask
    })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
