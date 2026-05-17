'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider } from '@/lib/profile-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setChecking(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  if (checking) {
    return (
      <div
        style={{ background: 'var(--bg-base)' }}
        className="flex h-screen items-center justify-center"
      >
        <div
          className="h-8 w-8 rounded-full border-4 animate-spin"
          style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <ProfileProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ProfileProvider>
  )
}
