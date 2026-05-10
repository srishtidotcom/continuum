/**
 * Quick test examples for Memory Stream & Search endpoints
 * 
 * Usage:
 * 1. Set LOCAL_USER_ID in .env.local to a valid UUID
 * 2. Run: npm run dev
 * 3. Copy-paste examples below into your terminal or Postman
 * 
 * Replace:
 * - <token> with actual JWT or remove it and use x-user-id header
 * - <uuid> with your LOCAL_USER_ID value
 */

// ============================================================================
// POST /api/input — Create a memory (prerequisite for other tests)
// ============================================================================

// Example 1: Simple memory
curl -X POST http://localhost:3000/api/input \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Exploring embeddings for semantic search. Using text-embedding-3-small from OpenAI for cost efficiency.",
    "halfBaked": false,
    "metadata": { "source": "notes" }
  }'

// Example 2: Half-baked thought
curl -X POST http://localhost:3000/api/input \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What if we could detect recurring themes automatically? Like pattern matching across thoughts?",
    "halfBaked": true
  }'

// Example 3: Thought with TODO
curl -X POST http://localhost:3000/api/input \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "TODO: Implement task extraction with better NLP. Remind me to research constraint extraction patterns.",
    "halfBaked": false
  }'

// ============================================================================
// GET /api/memories — Fetch memory stream
// ============================================================================

// Example 1: Basic fetch with date grouping (default)
curl http://localhost:3000/api/memories \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000"

// Example 2: With pagination
curl http://localhost:3000/api/memories?limit=5&offset=0 \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000"

// Example 3: Without date grouping (flat list)
curl http://localhost:3000/api/memories?groupBy=none \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000"

// Example 4: With JWT token (production)
curl http://localhost:3000/api/memories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// ============================================================================
// POST /api/search — Search memories
// ============================================================================

// Example 1: Keyword search
curl -X POST http://localhost:3000/api/search \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "embeddings",
    "type": "keyword",
    "limit": 10
  }'

// Example 2: Semantic search (requires OPENAI_API_KEY)
curl -X POST http://localhost:3000/api/search \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What have I been working on with AI?",
    "type": "semantic",
    "limit": 10,
    "threshold": 0.5
  }'

// Example 3: Hybrid search (combines both)
curl -X POST http://localhost:3000/api/search \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "memory search",
    "type": "hybrid",
    "limit": 20,
    "threshold": 0.4
  }'

// Example 4: Search with lower threshold (more results)
curl -X POST http://localhost:3000/api/search \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "building with Next.js",
    "type": "semantic",
    "threshold": 0.3,
    "limit": 50
  }'

// ============================================================================
// Testing with JavaScript/TypeScript
// ============================================================================

// Node.js example (add to a test file)
const userId = "550e8400-e29b-41d4-a716-446655440000"
const baseUrl = "http://localhost:3000"

// Test 1: Create a memory
async function testCreateMemory() {
  const res = await fetch(`${baseUrl}/api/input`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': userId 
    },
    body: JSON.stringify({
      text: "Testing the memory stream API",
      halfBaked: false
    })
  })
  console.log('Create memory:', await res.json())
}

// Test 2: Fetch memories
async function testFetchMemories() {
  const res = await fetch(
    `${baseUrl}/api/memories?limit=10&offset=0&groupBy=date`,
    { headers: { 'x-user-id': userId } }
  )
  console.log('Fetch memories:', await res.json())
}

// Test 3: Search
async function testSearch() {
  const res = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': userId 
    },
    body: JSON.stringify({
      query: "embeddings search",
      type: "hybrid",
      limit: 10
    })
  })
  console.log('Search results:', await res.json())
}

// Run tests
;(async () => {
  await testCreateMemory()
  await testFetchMemories()
  await testSearch()
})()

// ============================================================================
// Testing with Browser Console
// ============================================================================

// Copy-paste into browser console (app must be running at localhost:3000)

// Create memory
fetch('/api/input', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Testing from browser console",
    halfBaked: true
  })
}).then(r => r.json()).then(console.log)

// Fetch memories
fetch('/api/memories?limit=5').then(r => r.json()).then(console.log)

// Search
fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "browser test",
    type: "hybrid"
  })
}).then(r => r.json()).then(console.log)

// ============================================================================
// Performance Testing
// ============================================================================

// Test memory fetch with pagination (measure page load time)
async function testPaginationPerformance() {
  const results = []
  for (let offset = 0; offset < 100; offset += 20) {
    const start = performance.now()
    const res = await fetch(`/api/memories?limit=20&offset=${offset}`)
    const data = await res.json()
    const duration = performance.now() - start
    results.push({ offset, duration, count: Object.values(data.data).flat().length })
  }
  console.table(results)
}

// Test search performance (measure query time)
async function testSearchPerformance() {
  const queries = [
    { q: "short", type: "keyword" },
    { q: "medium length query here", type: "semantic" },
    { q: "What have I been thinking about?", type: "hybrid" }
  ]
  
  for (const { q, type } of queries) {
    const start = performance.now()
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, type })
    })
    const data = await res.json()
    const duration = performance.now() - start
    console.log(`${type} search: ${duration.toFixed(2)}ms (${data.count} results)`)
  }
}

// ============================================================================
// Error Scenarios
// ============================================================================

// Test 1: Missing user ID
curl http://localhost:3000/api/memories
// Expected: 401 Unauthorized

// Test 2: Empty query
curl -X POST http://localhost:3000/api/search \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{ "query": "" }'
// Expected: 400 Bad Request

// Test 3: Missing OPENAI_API_KEY for semantic search
curl -X POST http://localhost:3000/api/search \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{ "query": "test", "type": "semantic" }'
// Expected: Empty results (graceful fallback)
