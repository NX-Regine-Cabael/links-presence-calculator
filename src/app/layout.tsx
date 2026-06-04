import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Smartwork Calculator',
  description: 'Calcola la tua percentuale di lavoro agile',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} bg-[#0f172a] text-slate-100 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
