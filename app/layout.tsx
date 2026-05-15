import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/app/providers'

export const metadata: Metadata = {
  title: 'Pocket — Roommate Expense Splitter',
  description: 'Split expenses with roommates, settle up in one tap.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#f6faf6]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
