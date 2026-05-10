"use client"

import Input from '../components/Input'
import Stream from '../components/Stream'
import Chat from '../components/Chat'

export default function Page() {
  return (
    <section className="space-y-6">
      {/* Input */}
      <Input />

      {/* Unified view with Chat integration */}
      <div className="space-y-6">
        {/* Chat/Reflection area */}
        <div className="h-[300px]">
          <Chat />
        </div>

        {/* Stream view */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Memory Stream</h2>
          <Stream />
        </div>
      </div>
    </section>
  )
}

