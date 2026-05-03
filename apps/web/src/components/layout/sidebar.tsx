'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { listSessions } from '@/lib/api/sessions'
import { listKnowledgeBases } from '@/lib/api/knowledge-bases'

function NavItem({
  href,
  children,
  active,
}: {
  href: string
  children: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      {children}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  const { data: kbResult } = useQuery({
    queryKey: ['knowledge-bases', 1, 6],
    queryFn: () => listKnowledgeBases(1, 6),
    staleTime: 30_000,
  })

  const { data: sessionResult } = useQuery({
    queryKey: ['sessions', 1, 8],
    queryFn: () => listSessions(1, 8),
    staleTime: 30_000,
  })

  const knowledgeBases = kbResult?.success ? kbResult.data.items : []
  const sessions = sessionResult?.success ? sessionResult.data.items : []

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-semibold text-sidebar-foreground">Sage</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        {/* Knowledge Bases */}
        <section>
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Knowledge Bases
            </span>
            <Link
              href="/dashboard/knowledge-bases"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              All
            </Link>
          </div>
          <div className="flex flex-col gap-0.5">
            <NavItem
              href="/dashboard/knowledge-bases"
              active={pathname === '/dashboard/knowledge-bases'}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              All knowledge bases
            </NavItem>
            {knowledgeBases.slice(0, 5).map((kb) => (
              <NavItem
                key={kb.id}
                href={`/dashboard/knowledge-bases/${kb.id}`}
                active={pathname === `/dashboard/knowledge-bases/${kb.id}`}
              >
                <span className="truncate">{kb.name}</span>
              </NavItem>
            ))}
          </div>
        </section>

        {/* Sessions */}
        <section>
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent Chats
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {sessions.slice(0, 7).map((s) => (
              <NavItem
                key={s.id}
                href={`/dashboard/sessions/${s.id}`}
                active={pathname === `/dashboard/sessions/${s.id}`}
              >
                <svg
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <span className="truncate">{s.title}</span>
              </NavItem>
            ))}
            {sessions.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No chats yet</p>
            )}
          </div>
        </section>
      </nav>
    </aside>
  )
}
