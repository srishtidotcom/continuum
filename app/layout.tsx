import './globals.css'
import Sidebar from '../components/Sidebar'
import MobileSidebar from '../components/MobileSidebar'
import AuthButton from '../components/AuthButton'
import { ToastProvider } from '../lib/useToast'
import ToastContainerWithContext from '../components/ToastContainer'

export const metadata = {
  title: 'Continuum',
  description: 'Frictionless conversational memory'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        <ToastProvider>
          <div className="flex h-screen min-h-screen overflow-hidden">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="shrink-0 border-b border-[color:var(--color-border)] bg-[rgba(8,8,7,0.68)] px-4 py-4 backdrop-blur-xl md:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MobileSidebar />
                    <div>
                      <h1 className="font-display text-2xl font-medium leading-none text-[color:var(--color-text)]">
                        Continuum
                      </h1>
                      <p className="mt-1 hidden text-[11px] uppercase tracking-[0.24em] text-[color:var(--color-faint)] sm:block">
                        Your second brain
                      </p>
                    </div>
                  </div>
                  <AuthButton />
                </div>
              </header>

              <main className="continuum-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
                  {children}
                </div>
              </main>
            </div>
          </div>

          <ToastContainerWithContext />
        </ToastProvider>
      </body>
    </html>
  )
}
