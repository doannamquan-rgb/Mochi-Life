'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) {
      setProfile(data)
    }
    return data
  }

  function updateLocalProfile(partial: Partial<UserProfile>) {
    setProfile(prev => prev ? { ...prev, ...partial } : null)
  }

  useEffect(() => {
    const supabase = createClient()

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        await fetchProfile(user.id)
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    profile,
    loading,
    refreshProfile: async () => { if (user) await fetchProfile(user.id) },
    updateLocalProfile,
  }
}
