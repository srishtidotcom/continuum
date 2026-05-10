const { createClient } = require('@supabase/supabase-js')

// Simple smoke test to compute discovery hints for the user's recent memories
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... USER_ID=... node scripts/smoke-hints.js

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  const userId = process.env.USER_ID

  if (!url || !key || !userId) {
    console.error('Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), and USER_ID')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const SEARCH_WINDOW = 200
  const SIM_THRESHOLD = 0.9

  // fetch recent memories
  const { data: recentMemories, error: recentErr } = await supabase
    .from('memories')
    .select('id, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(SEARCH_WINDOW)

  if (recentErr) {
    console.error('Error fetching memories:', recentErr)
    process.exit(1)
  }

  if (!recentMemories || recentMemories.length === 0) {
    console.log('No memories found for user')
    return
  }

  const ids = recentMemories.map(m => m.id)
  const { data: embeds, error: embedErr } = await supabase
    .from('memory_embeddings')
    .select('memory_id, embedding')
    .in('memory_id', ids)

  if (embedErr) {
    console.error('Error fetching embeddings:', embedErr)
    process.exit(1)
  }

  const embedMap = {}
  for (const e of embeds) {
    embedMap[e.memory_id] = e.embedding
  }

  const dot = (a, b) => a.reduce((s, v, i) => s + v * (b[i] || 0), 0)
  const norm = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const cosine = (a, b) => {
    if (!a || !b) return 0
    const nd = dot(a, b)
    const nn = norm(a) * norm(b)
    return nn === 0 ? 0 : nd / nn
  }

  const daysBetween = (a, b) => {
    const da = new Date(a)
    const db = new Date(b)
    const diff = Math.abs(da.getTime() - db.getTime())
    return Math.round(diff / (1000 * 60 * 60 * 24))
  }

  // compute hints for each memory
  const hints = []
  for (const mem of recentMemories) {
    const embA = embedMap[mem.id]
    if (!embA) continue

    let best = null
    for (const cand of recentMemories) {
      if (cand.id === mem.id) continue
      if (new Date(cand.created_at) >= new Date(mem.created_at)) continue
      const embB = embedMap[cand.id]
      if (!embB) continue
      const sim = cosine(embA, embB)
      if (!best || sim > best.sim) best = { id: cand.id, sim, snippet: (cand.text || '').slice(0, 240), days: daysBetween(mem.created_at, cand.created_at) }
    }

    if (best && best.sim >= SIM_THRESHOLD) {
      hints.push({ memory_id: mem.id, related_memory_id: best.id, similarity: best.sim, days_ago: best.days, snippet: best.snippet })
    }
  }

  console.log('Found', hints.length, 'hints')
  for (const h of hints.slice(0, 50)) {
    console.log('- memory:', h.memory_id, 'related:', h.related_memory_id, 'sim:', h.similarity.toFixed(3), 'days:', h.days_ago)
    console.log('  snippet:', h.snippet)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
