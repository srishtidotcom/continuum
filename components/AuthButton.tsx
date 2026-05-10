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
      <div className="flex items-center gap-2">
        <div className="text-sm text-zinc-300">{user.email}</div>
        <button className="text-sm px-3 py-1 border rounded" onClick={signOut}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button className="text-sm px-3 py-1 bg-white text-black rounded" onClick={signIn}>
      Sign in
    </button>
  )
}
