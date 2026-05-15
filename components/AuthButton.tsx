"use client"

import { useRouter } from 'next/navigation'

export default function AuthButton() {
  const router = useRouter()

  function openSettings() {
    router.push('/settings')
  }

  return (
    <button
      className="rounded-[var(--radius-soft)] bg-[color:var(--color-text)] px-3 py-1 text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)]"
      onClick={openSettings}
    >
      Account
    </button>
  )
}
