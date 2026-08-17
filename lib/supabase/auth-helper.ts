import { createClient as createServerCookieClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { User, SupabaseClient } from '@supabase/supabase-js'

export interface AuthenticatedUserResult {
  user: User | null
  supabase: SupabaseClient<any, "public", any> | null
  authType: 'cookie' | 'bearer' | null
  error: Error | null
}

/**
 * Resolves the authenticated user and a scoped Supabase client from either:
 * 1. Mobile Authorization: Bearer <JWT_Token> header
 * 2. Web SSR Cookie session (cookies())
 *
 * Guarantees that client-sent body parameters (like user_id) are NEVER trusted blindly.
 */
export async function getAuthenticatedUser(request?: Request): Promise<AuthenticatedUserResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      supabase: null,
      authType: null,
      error: new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    }
  }

  // 1. Check for Authorization: Bearer header (Mobile client)
  const authHeader = request?.headers?.get('authorization') || request?.headers?.get('Authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim()
    if (!token) {
      return { user: null, supabase: null, authType: null, error: new Error('Empty bearer token') }
    }

    try {
      const bearerClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })

      const { data: { user }, error: userError } = await bearerClient.auth.getUser(token)
      if (userError || !user) {
        return { user: null, supabase: null, authType: null, error: userError || new Error('Invalid bearer token') }
      }

      return {
        user,
        supabase: bearerClient as any,
        authType: 'bearer',
        error: null,
      }
    } catch (e: any) {
      return { user: null, supabase: null, authType: null, error: e }
    }
  }

  // 2. Fallback to Web SSR Cookie Client
  try {
    const cookieClient = await createServerCookieClient()
    const { data: { user }, error: userError } = await cookieClient.auth.getUser()

    if (userError || !user) {
      return { user: null, supabase: null, authType: null, error: userError || new Error('No cookie session found') }
    }

    return {
      user,
      supabase: cookieClient as any,
      authType: 'cookie',
      error: null,
    }
  } catch (e: any) {
    return { user: null, supabase: null, authType: null, error: e }
  }
}
