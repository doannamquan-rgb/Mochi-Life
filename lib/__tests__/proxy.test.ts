import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { proxy } from '../../proxy'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))
const getUser = vi.fn()

describe('public landing page and existing auth redirects', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    vi.mocked(createServerClient).mockReturnValue({ auth: { getUser } } as unknown as ReturnType<typeof createServerClient>)
  })

  it.each([false, true])('serves / without auth lookup (session cookie: %s)', async (hasCookie) => {
    const request = new NextRequest('https://mochilife.site/', {
      headers: hasCookie ? { cookie: 'sb-test-auth-token=existing-session' } : {},
    })
    const response = await proxy(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('serves / even when Supabase is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect((await proxy(new NextRequest('https://mochilife.site/'))).status).toBe(200)
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it.each(['/dashboard', '/chinese', '/fitness', '/expenses'])('keeps %s protected', async (path) => {
    getUser.mockResolvedValue({ data: { user: null } })
    const response = await proxy(new NextRequest(`https://mochilife.site${path}`))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://mochilife.site/login')
  })

  it('allows an authenticated user into the dashboard', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'test-user' } } })
    expect((await proxy(new NextRequest('https://mochilife.site/dashboard'))).status).toBe(200)
  })

  it.each(['/login', '/register', '/forgot-password'])('allows a guest into %s', async (path) => {
    getUser.mockResolvedValue({ data: { user: null } })
    expect((await proxy(new NextRequest(`https://mochilife.site${path}`))).status).toBe(200)
  })

  it('keeps the existing dashboard redirect for signed-in users visiting /login', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'test-user' } } })
    const response = await proxy(new NextRequest('https://mochilife.site/login'))
    expect(response.headers.get('location')).toBe('https://mochilife.site/dashboard')
  })
})
