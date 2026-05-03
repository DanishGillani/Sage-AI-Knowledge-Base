import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { QueryProvider } from '@/providers/query-provider'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Sage — AI Knowledge Base',
    template: '%s | Sage',
  },
  description:
    'Drop in your docs. Ask questions. Get answers with sources. An AI-powered knowledge base for technical teams.',
  keywords: ['AI', 'knowledge base', 'RAG', 'document search', 'technical teams'],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
