"use client"

import { useEffect, useState } from 'react'
import { useTasks } from '../lib/useTasks'

export default function Tasks() {
  const { tasks, loading, error, fetchTasks, toggleTaskCompletion } = useTasks()
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      const completed = filter === 'completed' ? true : filter === 'active' ? false : undefined
      fetchTasks(completed)
      setIsInitialized(true)
    }
  }, [])

  const handleFilterChange = (newFilter: 'all' | 'active' | 'completed') => {
    setFilter(newFilter)
    const completed = newFilter === 'completed' ? true : newFilter === 'active' ? false : undefined
    fetchTasks(completed)
  }

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      await toggleTaskCompletion(taskId, currentCompleted)
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-medium text-[color:var(--color-text)]">Tasks</h2>
        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--color-muted)]">
          <div className="rounded-full border border-[color:var(--color-border)] bg-white/[0.035] px-3 py-1">
            {stats.total} total
          </div>
          <div className="rounded-full border border-sky-200/10 bg-sky-300/10 px-3 py-1 text-sky-100/80">
            {stats.active} active
          </div>
          <div className="rounded-full border border-emerald-200/10 bg-emerald-300/10 px-3 py-1 text-emerald-100/80">
            {stats.completed} done
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[color:var(--color-border)]">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`-mb-[1px] border-b px-3 py-2 text-sm font-medium ${
              filter === f
                ? 'border-[color:var(--color-accent)] text-[color:var(--color-text)]'
                : 'border-transparent text-[color:var(--color-faint)] hover:text-[color:var(--color-muted)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-[var(--radius-soft)] border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">
          Error loading tasks: {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-8 text-center text-[color:var(--color-faint)]">
          Loading tasks...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <div className="py-12 text-center text-[color:var(--color-faint)]">
          <p className="font-display mb-2 text-2xl text-[color:var(--color-muted)]">No {filter === 'all' ? '' : filter} tasks yet.</p>
          <p className="text-xs">
            {filter === 'all'
              ? 'Tasks are automatically extracted from your memories.'
              : filter === 'active'
                ? 'All caught up.'
                : 'Great work!'}
          </p>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-[var(--radius-soft)] border p-4 ${
              task.completed
                ? 'border-[color:var(--color-border)] bg-white/[0.025] opacity-60'
                : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-border-strong)]'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => handleToggleTask(task.id, task.completed)}
                className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                  task.completed
                    ? 'border-emerald-200/30 bg-emerald-300/20'
                    : 'border-[color:var(--color-border-strong)] hover:border-[color:var(--color-accent)]/50'
                }`}
              >
                {task.completed && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-relaxed break-words ${
                    task.completed
                      ? 'line-through text-[color:var(--color-faint)]'
                      : 'text-[color:var(--color-text)]'
                  }`}
                >
                  {task.title}
                </p>

                <div className="flex gap-2 items-center mt-2">
                  {task.due_date && (
                    <div className="rounded-full bg-white/[0.035] px-2 py-1 text-xs text-[color:var(--color-muted)]">
                      {(() => {
                        const due = new Date(task.due_date)
                        const today = new Date()
                        const tomorrow = new Date(today)
                        tomorrow.setDate(tomorrow.getDate() + 1)

                        const isToday =
                          due.toDateString() === today.toDateString()
                        const isTomorrow =
                          due.toDateString() === tomorrow.toDateString()
                        const isPast = due < today && !isToday

                        if (isToday) return 'Today'
                        if (isTomorrow) return 'Tomorrow'
                        if (isPast && !task.completed)
                          return `Overdue ${due.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}`
                        return due.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })
                      })()}
                    </div>
                  )}

                  <div className="text-xs text-[color:var(--color-faint)]">
                    {new Date(task.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
