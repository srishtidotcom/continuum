'use client'

import { useState, useCallback } from 'react'

export interface Task {
  id: string
  title: string
  due_date?: string | null
  completed: boolean
  memory_id?: string
  created_at: string
}

interface TasksResponse {
  ok: boolean
  tasks: Task[]
  total: number
}

interface UpdateTaskBody {
  completed?: boolean
  title?: string
  due_date?: string
}

/**
 * Hook to fetch and manage tasks
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchTasks = useCallback(
    async (completed?: boolean, limit = 50, offset = 0) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset)
        })

        if (completed !== undefined) {
          params.append('completed', String(completed))
        }

        const res = await fetch(`/api/tasks?${params}`, {
          headers: {
            'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''}`
          }
        })

        if (!res.ok) {
          throw new Error(`Failed to fetch tasks: ${res.statusText}`)
        }

        const data: TasksResponse = await res.json()

        if (data.ok) {
          setTasks(data.tasks)
          setTotal(data.total)
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

  const updateTask = useCallback(
    async (taskId: string, updates: UpdateTaskBody) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') ?? '' : ''}`
          },
          body: JSON.stringify(updates)
        })

        if (!res.ok) {
          throw new Error(`Failed to update task: ${res.statusText}`)
        }

        const data = await res.json()

        if (data.ok) {
          // Update local state
          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            )
          )
          return data.task
        } else {
          throw new Error('API returned ok: false')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        throw err
      }
    },
    []
  )

  const toggleTaskCompletion = useCallback(
    async (taskId: string, completed: boolean) => {
      return updateTask(taskId, { completed: !completed })
    },
    [updateTask]
  )

  return {
    tasks,
    loading,
    error,
    total,
    fetchTasks,
    updateTask,
    toggleTaskCompletion
  }
}
