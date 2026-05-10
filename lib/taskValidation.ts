/**
 * Task extraction types and validation
 * Ensures LLM responses are properly validated before use
 */

/**
 * Extracted task from memory
 */
export interface ExtractedTask {
  title: string
  due_date?: Date
  priority?: 'high' | 'medium' | 'low'
}

/**
 * LLM task extraction response
 * Must validate this against our interface before using
 */
export interface LLMTaskResponse {
  tasks?: Array<{
    title?: string
    due_date?: string | null
    priority?: string
  }>
  error?: string
}

/**
 * Validate and sanitize LLM task extraction response
 * @param response - Raw response from LLM
 * @returns Array of validated tasks or empty array if invalid
 */
export function validateTaskResponse(response: unknown): ExtractedTask[] {
  if (!response || typeof response !== 'object') {
    console.warn('Invalid task response: not an object', response)
    return []
  }

  const llmResponse = response as LLMTaskResponse

  if (!Array.isArray(llmResponse.tasks)) {
    console.warn('Invalid task response: tasks is not an array', llmResponse)
    return []
  }

  const validatedTasks: ExtractedTask[] = []

  for (const task of llmResponse.tasks) {
    // Validate required fields
    if (!task.title || typeof task.title !== 'string' || !task.title.trim()) {
      console.warn('Skipping task with invalid title:', task)
      continue
    }

    const validated: ExtractedTask = {
      title: task.title.trim()
    }

    // Validate optional due date
    if (task.due_date) {
      try {
        const date = new Date(task.due_date)
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          validated.due_date = date
        }
      } catch (e) {
        console.warn('Invalid due_date format:', task.due_date)
      }
    }

    // Validate optional priority
    if (task.priority && ['high', 'medium', 'low'].includes(task.priority.toLowerCase())) {
      validated.priority = task.priority.toLowerCase() as 'high' | 'medium' | 'low'
    }

    validatedTasks.push(validated)
  }

  return validatedTasks
}
