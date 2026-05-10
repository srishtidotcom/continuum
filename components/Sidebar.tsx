"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'

type ViewMode = 'stream' | 'memories' | 'tasks' | 'settings'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems: Array<{ id: ViewMode; label: string; icon: string; path: string }> = [
    { id: 'stream', label: 'Stream', icon: '📜', path: '/' },
    { id: 'memories', label: 'Memories', icon: '🧠', path: '/memories' },
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/tasks' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' }
  ]

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <aside className="hidden md:flex w-48 bg-zinc-950 border-r border-zinc-800 min-h-screen flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Continuum</h2>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={`flex items-center gap-3 px-3 py-2 rounded transition text-sm font-medium ${
              isActive(item.path)
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
        <div>Prototype v0.1</div>
      </div>
    </aside>
  )
}
