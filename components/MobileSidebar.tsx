"use client"

import { useState } from 'react'
import Link from 'next/link'

type ViewMode = 'stream' | 'memories' | 'tasks' | 'settings'

export default function MobileSidebar() {
  const [open, setOpen] = useState(false)

  const navItems: Array<{ id: ViewMode; label: string; icon: string; path: string }> = [
    { id: 'stream', label: 'Stream', icon: '📜', path: '/' },
    { id: 'memories', label: 'Memories', icon: '🧠', path: '/memories' },
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/tasks' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' }
  ]

  return (
    <div className="md:hidden">
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="p-2 rounded-md bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <aside
            className="absolute left-0 top-0 bottom-0 w-56 bg-zinc-950 border-r border-zinc-800 p-4 transform transition-transform duration-200 ease-out"
            role="menu"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Continuum</h2>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded transition text-sm font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto text-xs text-zinc-500">Prototype v0.1</div>
          </aside>
        </div>
      )}
    </div>
  )
}
