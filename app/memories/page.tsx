"use client"

import Input from '../components/Input'
import SearchComponent from '../components/Search'

export default function MemoriesPage() {
  return (
    <section className="space-y-6">
      {/* Search */}
      <div>
        <h1 className="text-2xl font-semibold mb-4">Search Memories</h1>
        <SearchComponent />
      </div>
    </section>
  )
}
