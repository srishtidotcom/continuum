"use client"

import { useState } from 'react'
import Link from 'next/link'

type ViewMode = 'stream' | 'memories' | 'tasks' | 'settings'

export default function MobileSidebar() {
  const [open, setOpen] = useState(false)

  const navItems: Array<{ id: ViewMode; label: string; icon: string; path: string }> = [
    { id: 'stream', label: 'Stream', icon: '⌁', path: '/' },
    { id: 'memories', label: 'Memories', icon: '◌', path: '/memories' },
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/tasks' },
    { id: 'settings', label: 'Settings', icon: '◇', path: '/settings' }
  ]

  return (
    <div className="md:hidden">
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <aside
            className="absolute bottom-0 left-0 top-0 flex w-64 flex-col border-r border-[color:var(--color-border)] bg-[rgba(10,10,9,0.96)] p-4 shadow-2xl"
            role="menu"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-medium text-[color:var(--color-text)]">Continuum</h2>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-[var(--radius-soft)] text-[color:var(--color-muted)] hover:bg-white/[0.04] hover:text-[color:var(--color-text)]"
              >
                ✕
              </button>
            </div>

            <nav className="continuum-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center gap-3 rounded-[var(--radius-soft)] px-3 text-sm font-medium text-[color:var(--color-muted)] hover:bg-white/[0.04] hover:text-[color:var(--color-text)]"
                >
                  <span className="grid h-6 w-6 place-items-center text-lg leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="shrink-0 pt-4 text-xs text-[color:var(--color-faint)]">Prototype v0.1</div>
          </aside>
        </div>
      )}
    </div>
  )
}
