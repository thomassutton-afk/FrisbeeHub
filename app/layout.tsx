import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FrisbeeHub',
  description: 'The home Ultimate Frisbee has always deserved.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen`} style={{ background: '#1a1a1a' }}>
        <header style={{ background: '#1a1a1a', borderBottom: '1px solid #2e2e2e' }} className="sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg tracking-tight text-white">
              FrisbeeHub
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">Standings</Link>
              <Link href="/schedule" className="hover:text-white transition-colors">Schedule</Link>
            </nav>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  )
}