"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(data?.user ?? null)
    }
    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn() {
    // Redirect to provider for OAuth (Google)
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="hidden max-w-[220px] truncate text-sm text-[color:var(--color-muted)] sm:block">{user.email}</div>
        <button
          className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] px-3 py-1 text-sm text-[color:var(--color-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)]"
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      className="rounded-[var(--radius-soft)] bg-[color:var(--color-text)] px-3 py-1 text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)]"
      onClick={signIn}
    >
      Sign in
    </button>
  )
}
