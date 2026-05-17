'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface ProfileContextValue {
  profile: Profile | null
  esDueno: boolean
  loading: boolean
}

const ProfileContext = createContext<ProfileContextValue>({ profile: null, esDueno: false, loading: true })

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) setProfile(data as Profile)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, esDueno: profile?.rol === 'dueño', loading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
