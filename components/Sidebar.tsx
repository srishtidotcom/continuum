"use client"

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type ViewMode = 'stream' | 'memories' | 'tasks' | 'settings'

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  const navItems: Array<{ id: ViewMode; label: string; icon: string; path: string }> = [
    { id: 'stream', label: 'Stream', icon: '⌁', path: '/' },
    { id: 'memories', label: 'Memories', icon: '◌', path: '/memories' },
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/tasks' },
    { id: 'settings', label: 'Settings', icon: '◇', path: '/settings' }
  ]

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <aside
      className={`hidden h-screen min-h-0 shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[rgba(8,8,7,0.74)] backdrop-blur-xl md:flex ${
        collapsed ? 'w-[76px]' : 'w-60'
      }`}
    >
      <div className={`flex items-center border-b border-[color:var(--color-border)] p-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div>
            <h2 className="font-display text-2xl font-medium leading-none text-[color:var(--color-text)]">
              Continuum
            </h2>
            <div className="mt-2 h-px w-10 bg-[color:var(--color-accent)]/40" />
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)]"
        >
          <span className="text-lg leading-none">{collapsed ? '☰' : '‹'}</span>
        </button>
      </div>

      <nav className="continuum-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            title={collapsed ? item.label : undefined}
            className={`flex h-11 items-center rounded-[var(--radius-soft)] text-sm font-medium ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } ${
              isActive(item.path)
                ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] shadow-[inset_0_0_0_1px_rgba(215,199,164,0.12)]'
                : 'text-[color:var(--color-muted)] hover:bg-white/[0.035] hover:text-[color:var(--color-text)]'
            }`}
          >
            <span className="grid h-6 w-6 place-items-center text-lg leading-none">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={`border-t border-[color:var(--color-border)] p-4 text-xs text-[color:var(--color-faint)] ${collapsed ? 'text-center' : ''}`}>
        <div>{collapsed ? 'v0.1' : 'Prototype v0.1'}</div>
      </div>
    </aside>
  )
}
