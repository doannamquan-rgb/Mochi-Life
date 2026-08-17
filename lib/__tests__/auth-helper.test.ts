import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthenticatedUser } from '../supabase/auth-helper'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { createClient as createServerCookieClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

describe('getAuthenticatedUser (Dual Cookie + Bearer Authenticator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('authenticates mobile client via Authorization: Bearer header', async () => {
    const mockUser = { id: 'mobile-user-123', email: 'mobile@mochilife.app' }
    const mockBearerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    }
    vi.mocked(createSupabaseClient).mockReturnValue(mockBearerClient as any)

    const request = new Request('https://api.mochilife.app/api/ai/chat', {
      headers: {
        Authorization: 'Bearer valid-jwt-token-xyz',
      },
    })

    const result = await getAuthenticatedUser(request)

    expect(result.authType).toBe('bearer')
    expect(result.user?.id).toBe('mobile-user-123')
    expect(mockBearerClient.auth.getUser).toHaveBeenCalledWith('valid-jwt-token-xyz')
  })

  it('rejects invalid or expired Bearer token', async () => {
    const mockBearerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Invalid or expired token'),
        }),
      },
    }
    vi.mocked(createSupabaseClient).mockReturnValue(mockBearerClient as any)

    const request = new Request('https://api.mochilife.app/api/ai/chat', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    })

    const result = await getAuthenticatedUser(request)

    expect(result.authType).toBeNull()
    expect(result.user).toBeNull()
    expect(result.error).toBeDefined()
  })

  it('authenticates web client via SSR cookies when no Bearer header is present', async () => {
    const mockUser = { id: 'web-user-456', email: 'web@mochilife.app' }
    const mockCookieClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    }
    vi.mocked(createServerCookieClient).mockResolvedValue(mockCookieClient as any)

    const request = new Request('https://api.mochilife.app/api/ai/daily-brief')

    const result = await getAuthenticatedUser(request)

    expect(result.authType).toBe('cookie')
    expect(result.user?.id).toBe('web-user-456')
  })

  it('returns null user when neither Bearer nor Cookie session exists', async () => {
    const mockCookieClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Auth session missing'),
        }),
      },
    }
    vi.mocked(createServerCookieClient).mockResolvedValue(mockCookieClient as any)

    const result = await getAuthenticatedUser()

    expect(result.authType).toBeNull()
    expect(result.user).toBeNull()
  })
})
