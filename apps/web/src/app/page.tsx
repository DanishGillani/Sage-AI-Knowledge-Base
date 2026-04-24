// Root page — redirects to the onboarding/session selection screen
// Actual onboarding UI lives in (dashboard)/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
