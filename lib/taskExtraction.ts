/**
 * NLP-based task extraction utility
 * Uses OpenAI GPT to intelligently extract actionable tasks from memory text
 */

export interface ExtractedTask {
  title: string
  due_date?: Date
  description?: string
}

/**
 * Extract tasks from memory text using LLM
 * 
 * Sends the memory text to GPT-4o-mini which intelligently identifies
 * actionable items, deadlines, and tasks mentioned in the text.
 * 
 * Returns an array of extracted tasks or empty array if no tasks found.
 */
export async function extractTasksFromMemory(
  text: string,
  openaiKey: string
): Promise<ExtractedTask[]> {
  if (!text || !text.trim()) return []

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `You are a task extraction assistant. Extract actionable tasks from the given memory text.

For each task found, return a JSON array with objects in this format:
{
  "title": "concise task description (max 100 chars)",
  "due_date": "YYYY-MM-DD or null if no deadline mentioned",
  "description": "optional additional context (max 200 chars)"
}

If no actionable tasks are found, return an empty array [].

Only extract tasks that are:
- Actionable (something the user should do)
- Not completed (avoid "I did X" statements)
- Specific enough to be useful

Examples of tasks to extract:
- "Need to fix the bug in the authentication module"
- "Call Sarah about the meeting tomorrow"
- "Review the proposal by Friday"

Examples to skip:
- "I finished the report" (already done)
- "I was thinking about redesigning the UI" (too vague, not actionable)
- "The weather is nice" (not a task)`
          },
          {
            role: 'user',
            content: `Extract tasks from this memory:\n\n${text}`
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Task extraction error:', error)
      return []
    }

    const data = await response.json()
    let content = data?.choices?.[0]?.message?.content || ''

    // Parse JSON from response (might be wrapped in markdown code blocks)
    content = content.trim()
    if (content.startsWith('```json')) {
      content = content.slice(7)
    }
    if (content.startsWith('```')) {
      content = content.slice(3)
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3)
    }
    content = content.trim()

    const tasks = JSON.parse(content)

    // Validate and sanitize
    if (!Array.isArray(tasks)) {
      console.warn('Task extraction returned non-array:', tasks)
      return []
    }

    return tasks
      .filter((task) => task && typeof task.title === 'string')
      .map((task) => ({
        title: task.title.trim().slice(0, 240),
        due_date: task.due_date ? new Date(task.due_date) : undefined,
        description: task.description?.slice(0, 500)
      }))
  } catch (err) {
    console.error('Task extraction exception:', err)
    return []
  }
}

/**
 * Basic keyword-based task detection fallback
 * Used if LLM extraction fails or as a quick pre-filter
 */
export function detectTaskKeywords(text: string): boolean {
  const taskKeywords = [
    'todo',
    'to do',
    'to-do',
    'task',
    'tasks',
    'need to',
    'have to',
    'must',
    'should',
    'fix',
    'implement',
    'build',
    'create',
    'write',
    'review',
    'check',
    'call',
    'email',
    'send',
    'finish',
    'complete',
    'deadline',
    'due',
    'remind',
    'remember to'
  ]

  const lower = text.toLowerCase()
  return taskKeywords.some((keyword) => lower.includes(keyword))
}
