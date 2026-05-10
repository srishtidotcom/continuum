# Continuum — UI Wireframe (low-fidelity)

Overview
- Dark, minimal interface focused on quick capture and a single continuous stream.

Layout
- Left sidebar (narrow): vertical nav — Stream • Memories • Tasks • Settings
- Main area (primary): top unified input, below chronological memory stream.

Input (top)
- Full-width textarea with placeholder: "Dump your brain here. Half-formed thoughts welcome."
- Small `Half-baked` toggle to mark unfinished thoughts
- Primary `Save` button (right)

Stream
- Chronological cards with subtle date separators (Today, Yesterday, Earlier)
- Each card: timestamp, short rendered text, quick actions (star, pin, extract task)
- Infinite scroll with gentle loading animation

Memories (secondary view)
- Search bar (keyword + semantic)
- Grouping by clusters / suggested continuity items

Tasks
- List of auto-extracted tasks with due dates

Micro-joys
- Inline hint chips: "Related thought from 12 days ago"

Accessibility
- Keyboard-first: focus moves to input with `/` hotkey
- High-contrast text, large tap targets

Notes
- This is intentionally low-fidelity. Implement components as modular building blocks: `Input`, `Stream`, `MemoryCard`, `TaskList`, `Sidebar`.
