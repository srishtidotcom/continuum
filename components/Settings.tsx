"use client"

import { useEffect, useState } from 'react'

export default function Settings() {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [autoSaveInterval, setAutoSaveInterval] = useState(30) // seconds
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('continuum-settings')
    if (saved) {
      const settings = JSON.parse(saved)
      setVoiceEnabled(settings.voiceEnabled || false)
      setAutoSaveInterval(settings.autoSaveInterval || 30)
      setTheme(settings.theme || 'dark')
    }
  }, [])

  const saveSettings = () => {
    const settings = { voiceEnabled, autoSaveInterval, theme }
    localStorage.setItem('continuum-settings', JSON.stringify(settings))
  }

  useEffect(() => {
    saveSettings()
  }, [voiceEnabled, autoSaveInterval, theme])

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        {/* General Settings */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
          
          {/* Voice Input */}
          <div className="space-y-4 p-4 bg-zinc-900 border border-zinc-800 rounded">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-sm">Enable Voice Input</div>
                  <div className="text-xs text-zinc-500">Use Whisper to transcribe voice to text</div>
                </div>
              </label>
            </div>

            {/* Auto-save Interval */}
            <div className="border-t border-zinc-800 pt-4">
              <label className="block text-sm font-medium mb-2">
                Auto-save Interval (seconds)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="10"
                  value={autoSaveInterval}
                  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-zinc-400 w-12">{autoSaveInterval}s</span>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                How frequently to automatically save your thoughts
              </div>
            </div>

            {/* Theme */}
            <div className="border-t border-zinc-800 pt-4">
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1 rounded text-sm transition ${
                      theme === t
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded">
          <h3 className="text-sm font-medium mb-2">About</h3>
          <div className="text-xs text-zinc-400 space-y-1">
            <p>Continuum — Frictionless Conversational Memory</p>
            <p>Version 0.1.0 (Prototype)</p>
            <p className="pt-2">
              <a href="https://github.com" className="text-blue-400 hover:underline">
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
