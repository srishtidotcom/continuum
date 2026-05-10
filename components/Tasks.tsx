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
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <div className="flex gap-2 text-xs">
          <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded">
            {stats.total} total
          </div>
          <div className="px-3 py-1 bg-blue-900 border border-blue-800 rounded text-blue-200">
            {stats.active} active
          </div>
          <div className="px-3 py-1 bg-green-900 border border-green-800 rounded text-green-200">
            {stats.completed} done
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-[2px] transition ${
              filter === f
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-900 border border-red-700 rounded text-sm text-red-100">
          Error loading tasks: {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-zinc-500">
          Loading tasks...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <div className="text-center py-8 text-zinc-600">
          <p className="mb-2">No {filter === 'all' ? '' : filter} tasks yet.</p>
          <p className="text-xs text-zinc-700">
            {filter === 'all'
              ? 'Tasks are automatically extracted from your memories.'
              : filter === 'active'
                ? 'All caught up! 🎉'
                : 'Great work!'}
          </p>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`p-3 rounded border transition ${
              task.completed
                ? 'bg-zinc-900 border-zinc-800 opacity-60'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => handleToggleTask(task.id, task.completed)}
                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                  task.completed
                    ? 'bg-green-600 border-green-600'
                    : 'border-zinc-600 hover:border-zinc-500'
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
                      ? 'line-through text-zinc-600'
                      : 'text-zinc-100'
                  }`}
                >
                  {task.title}
                </p>

                <div className="flex gap-2 items-center mt-2">
                  {task.due_date && (
                    <div className="text-xs text-zinc-500 px-2 py-1 bg-zinc-800 rounded">
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

                        if (isToday) return '📅 Today'
                        if (isTomorrow) return '📅 Tomorrow'
                        if (isPast && !task.completed)
                          return `⚠️ ${due.toLocaleDateString('en-US', {
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

                  <div className="text-xs text-zinc-600">
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
