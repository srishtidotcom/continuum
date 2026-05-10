import './globals.css'
import Sidebar from '../components/Sidebar'
import MobileSidebar from '../components/MobileSidebar'
import AuthButton from '../components/AuthButton'
import { ToastProvider } from '../lib/useToast'
import ToastContainerWithContext from '../components/ToastContainer'

export const metadata = {
  title: 'Continuum — Prototype',
  description: 'Frictionless conversational memory'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex">
        <ToastProvider>
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="border-b border-zinc-800 p-4">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MobileSidebar />
                  <h1 className="text-lg font-semibold">Continuum (Prototype)</h1>
                </div>
                <AuthButton />
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto">
              <div className="max-w-6xl mx-auto p-4">
                {children}
              </div>
            </main>
          </div>

          {/* Toast Container */}
          <ToastContainerWithContext />
        </ToastProvider>
      </body>
    </html>
  )
}
