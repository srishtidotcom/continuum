"use client"

import Input from '../components/Input'
import Stream from '../components/Stream'
import Chat from '../components/Chat'

export default function Page() {
  return (
    <section className="space-y-14">
      <div className="mx-auto flex min-h-[44vh] max-w-3xl flex-col justify-center py-8 md:py-14">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.34em] text-[color:var(--color-faint)]">
            Continuum
          </p>
          <h2 className="font-display mt-4 text-4xl font-medium leading-tight text-[color:var(--color-text)] md:text-6xl">
            What wants to be remembered?
          </h2>
        </div>
        <Input />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-border)] pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-faint)]">
                Chronology
              </p>
              <h2 className="font-display mt-1 text-3xl font-medium text-[color:var(--color-text)]">
                Memory stream
              </h2>
            </div>
          </div>
          <Stream />
        </div>

        <div className="h-[420px] lg:sticky lg:top-8">
          <Chat />
        </div>
      </div>
    </section>
  )
}
