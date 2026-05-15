# Continuum — MVP Specification

## One-line description
A conversational memory layer that passively organizes thoughts, tasks, ideas, links, and unfinished reflections — without forcing users to manually structure anything.

## Product vision
Continuum reduces the friction between thinking and externalizing thought. Users dump half-formed ideas, impulsive links, and fleeting insights; the system passively organizes, connects, retrieves context, extracts tasks, and builds continuity across time.

## Core philosophy
- No manual folders, titles, tags, or conscious organization.
- Surface half-baked ideas at the right moments.
- Make external memory feel like a natural extension of the mind.

## Target users
- Students
- Builders & indie hackers
- Researchers
- Founders
- High idea-velocity people

## Common behaviors to support
- Rapid thought dumping
- Impulsive link saving
- Forgetting earlier ideas
- Notes scattered across apps
- Desire for continuity across time and conversations

## MVP scope (single focus)
Make it frictionless to dump information into a persistent, intelligent conversational memory system. Everything else is secondary.

## Functional requirements

1. Authentication
   - Email + Google OAuth
   - Persistent sessions
   - Strict per-user data isolation

2. Unified Thought Input
   - Single input field: “Dump your brain here…”
   - Paste support for text and links
   - Auto-save
   - Optional `half-baked` flag for unfinished thoughts

3. Memory Stream
   - Chronological timeline with infinite scroll
   - Automatic date grouping
   - Fast keyword + semantic search

4. Semantic Memory Retrieval
   - Embedding-based similarity search (Gemini embedding)
   - Contextual injection into conversations
   - Gentle discovery hints (e.g., “Related thought from 12 days ago”)

5. Conversational Reflection (killer feature)
   - Natural chat interface over full memory history
   - Example queries: “What have I been thinking about lately?”, “Find recurring themes”, “When did I first mention this idea?”

6. Automatic Task Extraction
   - Extract actionable tasks and deadlines
   - Dedicated Tasks tab

7. Link Understanding
   - Auto-extract metadata from pasted links
   - Intelligent categorization

8. Memory Connections
   - Detect recurring themes and meaningful clusters
   - Highlight continuity across time

## Non-functional requirements
- Performance: Input latency < 2s, Retrieval < 5s
- Simplicity: Minimal, calm, invisible interface
- Cost awareness: Mindful usage of paid APIs (embeddings / LLMs)
- Privacy: Memories private by default
- Code quality: Modular, functional-style architecture
- Accessibility: Mobile responsive, keyboard-first, dark-optimized

## Development principles
- Prefer small, testable pure functions
- Clear separation: UI, business logic, data access, AI layer
- Composable, modular code that’s easy to extend and test

## Recommended tech stack

- Frontend: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- Backend: Next.js API routes / Server Actions
- Database: Supabase (Postgres + pgvector)
- Embeddings: Gemini Embedding (`gemini-embedding-001`, 1536 dimensions)
- LLM: Gemini (`gemini-2.5-flash`, cost-aware usage)
- Deployment: Vercel + Supabase

## UI / UX direction
- Extreme minimalism, calm, dark-only interface
- Left sidebar: Stream • Memories • Tasks • Settings
- Main area: Unified input + chronological stream
- Input placeholders: “Dump your brain here.”, “What’s on your mind?”

## Features explicitly excluded from MVP
- Social/collaboration
- Calendars, kanban boards, complex workflows
- Fancy visualizations or memory graphs
- Autonomous AI agents
- Heavy customization

Reason: Validate the core loop (capture + retrieval) before expanding scope.

## Success criteria
The MVP is successful when users feel: “This understands my thinking better than my notes app ever did.” Emotional experience (reduced mental load + joy of rediscovery) > feature count.

## Potential future features (post-MVP)
- Proactive reminders
- Calendar integration
- Multimodal support (screenshots, images)
- Weekly AI reflections
- Local / fully private AI models
- Memory graph visualization

## Next steps (first milestones)
1. Prototype input + storage pipeline (auth → input → DB row + embedding)
2. Implement memory stream UI and basic search
3. Build conversational reflection demo using embeddings + LLM prompt templates
4. Add task extraction and Tasks tab

---
_Document created from initial product spec. For scaffolding or breaking this into issues, say which milestone you want next._
