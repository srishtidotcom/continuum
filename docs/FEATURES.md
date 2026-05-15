# Conversational Reflection & Tasks — Feature Documentation

## Overview

This document describes the two new MVP features:
1. **Conversational Reflection** — A chat interface for querying your memory history using embeddings and LLM
2. **Tasks Tab** — Automatic task extraction with NLP-based intelligence and task management UI

---

## Feature 1: Conversational Reflection 💭

### What It Does

The Conversational Reflection feature allows users to have natural language conversations about their memories. You can ask questions like:
- "What have I been thinking about lately?"
- "Find recurring themes in my thoughts"
- "When did I first mention this idea?"
- "What projects am I working on?"

The system retrieves relevant memories using semantic search (embeddings) and injects them as context into an LLM response, enabling intelligent, contextual answers grounded in your actual memory history.

### How It Works

1. **User inputs a question** in the chat interface
2. **System generates embedding** for the user's message using Gemini's `embedding-001`
3. **Semantic search** retrieves up to 10 most relevant memories (using pgvector cosine similarity, threshold: 0.3)
4. **LLM processes context** — Gemini generates a response using:
   - System prompt explaining the Continuum assistant role
   - Retrieved memories as context (formatted with dates)
   - User's natural language question
5. **Response delivered** with referenced memories highlighted

### API Endpoint

**POST /api/chat**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-uuid>" \
  -d '{
    "message": "What have I been thinking about?",
    "limit": 10
  }'
```

**Response:**
```json
{
  "ok": true,
  "message": "Based on your recent memories, you've been focused on...",
  "relevantMemories": [
    {
      "id": "memory-uuid",
      "text": "Working on authentication system",
      "created_at": "2025-05-10T14:23:00Z",
      "similarity": 0.87
    }
  ],
  "timestamp": "2025-05-10T14:25:00Z"
}
```

### Frontend Component

**Location:** `components/Chat.tsx`

Features:
- Conversational UI with message history
- Shows referenced memories for transparency
- Loading states with animated dots
- Error handling
- Timestamps for all messages

### Usage in App

Click the **Reflect** tab in the main navigation to access the chat interface.

### Configuration

- **Model:** Gemini (cost-efficient, fast)
- **Temperature:** 0.7 (balanced creativity/consistency)
- **Max tokens:** 500 per response
- **Memory threshold:** 0.3 (lower = more context, higher = more relevance)
- **Max context memories:** 10

### Environment Requirements

- `GOOGLE_API_KEY` — Must be set for embeddings and LLM generation

---

## Feature 2: Tasks Tab ✓

### What It Does

The Tasks Tab provides:
- **Automatic task extraction** — Intelligently identifies actionable items from your memories
- **Task management UI** — View, filter, and mark tasks complete
- **Extraction pipeline** — Uses NLP (GPT-4o-mini) for sophisticated task identification

No manual task entry required. Just dump your thoughts; the system extracts tasks automatically.

### How Task Extraction Works

When you save a memory, the system:

1. **Runs keyword detection** (fast, local)
   - Checks for task-related keywords: "todo", "need to", "fix", "implement", etc.
   - Only proceeds to LLM if keywords detected (cost optimization)

2. **Calls task extraction LLM** (if keywords found)
   - Sends memory text to Gemini
   - Prompt guides the model to extract:
     - **Title:** Concise task description (≤100 chars)
     - **Due date:** If mentioned (YYYY-MM-DD or null)
     - **Description:** Optional context (≤200 chars)
   - Filters out completed items, too-vague items, non-actionable statements

3. **Saves to database**
   - Stores extracted tasks linked to source memory
   - Can set due dates
   - Tracks completion status

### API Endpoints

#### Get All Tasks
**GET /api/tasks**

```bash
curl http://localhost:3000/api/tasks?limit=50&offset=0&completed=false \
  -H "x-user-id: <user-uuid>"
```

**Query Parameters:**
- `completed` — `true` | `false` | omitted (all tasks)
- `limit` — 1-100 (default: 50)
- `offset` — pagination offset (default: 0)

**Response:**
```json
{
  "ok": true,
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Fix authentication bug",
      "due_date": "2025-05-15T00:00:00Z",
      "completed": false,
      "memory_id": "memory-uuid",
      "created_at": "2025-05-10T14:23:00Z"
    }
  ],
  "total": 42
}
```

#### Update Task
**PATCH /api/tasks/:id**

```bash
curl -X PATCH http://localhost:3000/api/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-uuid>" \
  -d '{
    "completed": true,
    "title": "Updated task title",
    "due_date": "2025-05-20"
  }'
```

### Frontend Components

#### Tasks Component
**Location:** `components/Tasks.tsx`

Features:
- Filter by status: All / Active / Completed
- Task statistics (total, active, completed)
- Checkbox for quick completion toggle
- Due date highlighting (Today, Tomorrow, Overdue)
- Creation date display
- Responsive, minimal design

#### useTasks Hook
**Location:** `lib/useTasks.ts`

```typescript
const { tasks, loading, error, total, fetchTasks, updateTask, toggleTaskCompletion } = useTasks()

// Fetch tasks (optionally filtered by completion)
await fetchTasks(completed?: boolean, limit?: number, offset?: number)

// Update a task
await updateTask(taskId, { completed: true, title: '...', due_date: '2025-05-20' })

// Toggle completion status
await toggleTaskCompletion(taskId, currentCompletionStatus)
```

### Usage in App

Click the **Tasks** tab in the main navigation.

### Configuration

- **Extraction model:** Gemini
- **Temperature:** 0.3 (precise, literal extraction)
- **Max tokens:** 300
- **Keyword detection:** Local, instant
- **Extraction only if keywords found:** Cost optimization

### Task Extraction Examples

**Will extract:**
- "Need to review the proposal by Friday" → Title: "Review the proposal", Due: Friday
- "TODO: implement the user dashboard" → Title: "Implement the user dashboard"
- "Fix the bug in authentication" → Title: "Fix the bug in authentication"
- "Call Sarah about the meeting tomorrow" → Title: "Call Sarah about the meeting", Due: tomorrow
- "Remember to send the report" → Title: "Send the report"

**Will skip:**
- "I finished the report" (already completed)
- "The weather is nice" (not actionable)
- "I was thinking about redesigning the UI" (too vague)
- "I love coffee" (not a task)

---

## Integration with Memory Input

When you save a memory using the Input component:

1. Memory is created with embedding
2. Keyword detection runs (local, instant)
3. If keywords found, task extraction runs (LLM call)
4. Extracted tasks are saved with link to source memory
5. UI remains responsive (task extraction is background-friendly)

---

## Database Schema

### Tasks Table
```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  memory_id uuid REFERENCES memories(id) ON DELETE SET NULL,
  title text,
  due_date timestamptz,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Cost Optimization

### Conversational Reflection
- **Per query:** ~1 embedding + 1 LLM call (GPT-4o-mini)
- **Estimate:** ~0.002 USD per conversation

### Task Extraction
- **Per memory:** 1 embedding (already generated) + keyword detection (free) + 1 optional LLM call
- **Extraction cost:** ~0.0001 USD per task-containing memory
- **Keyword filtering prevents unnecessary LLM calls:** ~70-80% reduction in extraction costs

---

## Future Enhancements

- Proactive task reminders
- Due date suggestions
- Task subtasks
- Task prioritization
- Weekly task summaries
- Memory-to-task linking UI
- Task archival instead of deletion
- Recurring tasks
- Multi-user task collaboration

---

## Troubleshooting

### Chat returns no results
- Ensure you have memories in the system
- Try a different query phrasing
- Check Gemini API key is set and valid

### Tasks not extracting
- Ensure memory text contains task keywords
- Check Gemini API key
- Verify database task table exists

### Performance issues
- Chat is I/O bound (embedding + LLM)
  - Typical response time: 2-5 seconds
  - Can be optimized with response streaming
- Tasks are cached locally in React state
  - Pagination (limit 50) keeps in-memory footprint low
