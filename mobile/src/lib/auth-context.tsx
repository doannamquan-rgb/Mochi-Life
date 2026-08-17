import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, setupSupabaseAuthLifecycle } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Setup single root AppState auto-refresh listener
    const cleanupLifecycle = setupSupabaseAuthLifecycle()

    // 2. Restore initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setLoading(false)
    })

    // 3. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      cleanupLifecycle()
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error ? new Error(error.message) : null }
    } catch (e: any) {
      return { error: new Error(e.message || 'Đăng nhập thất bại') }
    }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      })
      if (error) return { error: new Error(error.message) }

      // Create initial profile if user was created
      if (data.user) {
        await supabase.from('user_profiles').upsert({
          user_id: data.user.id,
          display_name: displayName || email.split('@')[0],
        })
      }

      return { error: null }
    } catch (e: any) {
      return { error: new Error(e.message || 'Đăng ký thất bại') }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error: error ? new Error(error.message) : null }
    } catch (e: any) {
      return { error: new Error(e.message || 'Đăng xuất thất bại') }
    }
  }

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'mochilife://reset-password',
      })
      return { error: error ? new Error(error.message) : null }
    } catch (e: any) {
      return { error: new Error(e.message || 'Yêu cầu khôi phục mật khẩu thất bại') }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      return { error: error ? new Error(error.message) : null }
    } catch (e: any) {
      return { error: new Error(e.message || 'Cập nhật mật khẩu thất bại') }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
