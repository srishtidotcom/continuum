"use client"

import { useEffect, useState } from 'react'

export default function Settings() {
  const [autoSaveInterval, setAutoSaveInterval] = useState(30) // seconds
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('continuum-settings')
    if (saved) {
      const settings = JSON.parse(saved)
      setAutoSaveInterval(settings.autoSaveInterval || 30)
      setTheme(settings.theme || 'dark')
    }
  }, [])

  const saveSettings = () => {
    const settings = { autoSaveInterval, theme }
    localStorage.setItem('continuum-settings', JSON.stringify(settings))
  }

  useEffect(() => {
    saveSettings()
  }, [autoSaveInterval, theme])

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        {/* General Settings */}
        <div>
          <h2 className="font-display mb-4 text-3xl font-medium text-[color:var(--color-text)]">Settings</h2>
          
          <div className="continuum-panel space-y-5 rounded-[var(--radius-soft)] p-5">
            {/* Auto-save Interval */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
                Legacy Auto-save Interval
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="10"
                  value={autoSaveInterval}
                  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                  className="flex-1 accent-[color:var(--color-accent)]"
                />
                <span className="w-12 text-sm text-[color:var(--color-muted)]">{autoSaveInterval}s</span>
              </div>
              <div className="mt-2 text-xs leading-5 text-[color:var(--color-faint)]">
                New thoughts now save immediately when the input loses focus.
              </div>
            </div>

            {/* Theme */}
            <div className="border-t border-[color:var(--color-border)] pt-5">
              <label className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">Theme</label>
              <div className="flex gap-2">
                {(['dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-[var(--radius-soft)] px-3 py-1 text-sm ${
                      theme === t
                        ? 'bg-[color:var(--color-text)] text-[color:var(--color-bg)]'
                        : 'border border-[color:var(--color-border)] bg-white/[0.035] text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="continuum-panel rounded-[var(--radius-soft)] p-5">
          <h3 className="mb-2 text-sm font-medium text-[color:var(--color-text)]">About</h3>
          <div className="space-y-1 text-xs text-[color:var(--color-muted)]">
            <p>Continuum — Frictionless Conversational Memory</p>
            <p>Version 0.1.0 (Prototype)</p>
            <p className="pt-2">
              <a href="https://github.com" className="text-[color:var(--color-accent)] hover:text-[color:var(--color-text)]">
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
