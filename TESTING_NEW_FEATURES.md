# Testing Guide — Conversational Reflection & Tasks

Quick guide to test the new features locally.

## Setup

1. Ensure environment variables are set:
   ```bash
   GOOGLE_API_KEY=...
   LOCAL_USER_ID=<your-test-uuid>  # for local testing
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`

---

## Testing Conversational Reflection (Chat)

### Step 1: Create sample memories
Click the **Stream** tab and add 3-5 memories with natural language:
- "Today I worked on refactoring the authentication system to improve security"
- "Thinking about redesigning the dashboard UI for better UX"
- "Had a great discussion with Sarah about the project roadmap"
- "Struggling with TypeScript generics, need to review the docs"
- "Fixed a critical bug in the payment processing module"

### Step 2: Test chat queries
Click the **Reflect** tab and try these queries:

✅ **Good queries** (should retrieve relevant memories):
- "What have I been working on?"
- "What technical challenges am I facing?"
- "Tell me about my recent discussions"
- "What projects need my attention?"
- "Find recurring themes in my thoughts"

❌ **Edge cases** (should handle gracefully):
- Empty query → Button disabled
- "asdfghjkl random text" → May retrieve nothing or vague match
- Very long query → Should still work, tokens managed

### Step 3: Verify response quality
- Response should reference specific memories
- Memory dates/snippets shown in "Referenced memories" section
- Response should be conversational but grounded in actual memories
- Check that memory text matches retrieved items

**Example response:**
```
Based on your recent work, you've been heavily focused on system 
architecture improvements. You mentioned working on authentication 
refactoring and fixing payment processing bugs. You also seem to be 
thinking about UI/UX improvements to the dashboard...

Referenced memories:
- May 10 — "refactoring the authentication system..."
- May 10 — "redesigning the dashboard UI..."
- May 10 — "Fixed a critical bug in payment..."
```

---

## Testing Tasks Tab

### Step 1: Create task-containing memories
Go to **Stream** tab and save memories with task language:

**Will extract tasks:**
- "TODO: implement user profile page by Friday"
- "Need to fix the login bug ASAP"
- "Remind me to review the design proposal"
- "Must update the dependencies and run tests"
- "Have to call the client about the deadline"

**Won't extract (intentionally):**
- "I completed the user profile page yesterday"
- "I was thinking about implementing auth"
- "The weather is nice today"

### Step 2: Check Tasks tab
Click the **Tasks** tab. You should see:
- Tasks from your memory extractions
- Statistics (Total: 5, Active: 4, Done: 1)
- Filter buttons: **All** | **Active** | **Completed**
- Extracted due dates if mentioned

Expected extracted tasks:
```
✓ Implement user profile page (Due: Friday)
✓ Fix the login bug (Due: ASAP / Today or without due date)
✓ Review the design proposal
✓ Update the dependencies and run tests
✓ Call the client about the deadline
```

### Step 3: Test task interactions

1. **Mark complete:**
   - Click checkbox on an active task
   - Task should move to completed
   - Filter to "Completed" to verify

2. **Filter tasks:**
   - Click "Active" → See only incomplete tasks
   - Click "Completed" → See only finished tasks
   - Click "All" → See all tasks

3. **Due date visualization:**
   - "Today" shows 📅 Today badge
   - "Tomorrow" shows 📅 Tomorrow badge
   - Past dates show ⚠️ with the date
   - Future dates show date

4. **Persistence:**
   - Refresh the page
   - Completed status should persist
   - Statistics should update

---

## Testing API Endpoints Directly

### Test Chat API
```bash
# Add sample memory first
curl -X POST http://localhost:3000/api/input \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{"text": "Working on the TypeScript migration project", "halfBaked": false}'

# Sleep 2 seconds to ensure memory is saved

# Query chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{
    "message": "What am I working on?",
    "limit": 10
  }'

# Expected response:
# {
#   "ok": true,
#   "message": "...",
#   "relevantMemories": [{...}, ...],
#   "timestamp": "..."
# }
```

### Test Tasks API
```bash
# Get all tasks
curl http://localhost:3000/api/tasks?limit=20 \
  -H "x-user-id: test-user-123"

# Get only active tasks
curl http://localhost:3000/api/tasks?completed=false \
  -H "x-user-id: test-user-123"

# Update a task (mark complete)
TASK_ID="<task-uuid-from-get>"
curl -X PATCH http://localhost:3000/api/tasks/$TASK_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{"completed": true}'

# Expected response:
# {"ok": true, "task": {...}}
```

---

## Performance Testing

### Chat Response Time
Expected latency:
- Embedding generation: ~500ms
- Semantic search: ~100ms
- LLM response: ~1-3 seconds
- **Total:** 2-4 seconds

Test with:
```bash
time curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{"message": "What am I working on?"}'
```

### Task Extraction Performance
- Keyword detection: <1ms (local)
- Task extraction (if triggered): ~1-2 seconds
- Should not block memory save operation

---

## Edge Cases & Error Handling

### Should handle gracefully:

1. **No memories yet**
   - Chat returns: "No relevant memories found"
   - Tasks shows: "No tasks yet"

2. **Invalid user ID**
   - Chat/Tasks returns: 401 Unauthorized

3. **Missing Gemini key**
   - Chat returns: 500 with error message
   - Tasks extraction skipped

4. **Large context**
   - 20 retrieved memories + 1 LLM call
   - Should still complete within 5 seconds

5. **Empty memory text**
   - Task extraction skipped
   - No tasks created

---

## Debugging Tips

### Chat not returning memories?
Check:
- Gemini API key is valid
- Embedding API is working: `curl https://generativelanguage.googleapis.com/v1/models?key=$GOOGLE_API_KEY`
- pgvector installed in Postgres
- `search_memories_by_embedding` RPC function exists

### Tasks not extracting?
Check:
- Memory text contains task keywords
- Gemini API key is set
- Task table exists in database
- Check server logs for LLM response

### Performance issues?
- Chat is I/O bound (check Gemini API latency)
- Consider response streaming for large contexts (future feature)
- Task extraction only on keyword match (cost optimization working)

---

## Success Criteria

✅ **Conversational Reflection is working when:**
- Chat responds to natural language queries
- Retrieved memories are relevant to the query
- Responses are grounded in actual memory content
- References are accurate

✅ **Tasks are working when:**
- Tasks are extracted from memory containing task keywords
- Due dates are detected and formatted correctly
- Completion status persists
- Filtering works correctly
- Task statistics update in real-time

---

## Cleanup for Next Test Run

To reset and test fresh:
```bash
# Delete all memories and tasks for a user
curl -X DELETE http://localhost:3000/api/test/cleanup \
  -H "x-user-id: test-user-123"
  
# Note: This is a test endpoint (if implemented)
# Alternative: Use Supabase dashboard to delete rows
```
