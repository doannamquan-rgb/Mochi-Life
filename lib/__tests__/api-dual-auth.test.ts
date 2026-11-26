import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/auth-helper', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/lib/backup', () => ({ validateBackupData: vi.fn() }))
vi.mock('@/lib/import-url-security', () => ({
  fetchPinnedUrl: vi.fn(),
  isPrivateIP: vi.fn(),
  resolvePublicAddress: vi.fn(async () => ({ address: '93.184.216.34', family: 4 })),
}))

import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { validateBackupData } from '@/lib/backup'
import { fetchPinnedUrl } from '@/lib/import-url-security'
import { POST as restorePost } from '@/app/api/restore/route'
import { POST as importPost } from '@/app/api/import/url/route'

const user = { id: 'authenticated-user', email: 'user@example.test' }
const rpc = vi.fn()

function request(url: string, body: unknown, authorization = 'Bearer valid-token') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify(body),
  })
}

describe('dual-auth API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: { success: true }, error: null })
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: user as never,
      supabase: { rpc } as never,
      authType: 'bearer',
      error: null,
    })
    vi.mocked(validateBackupData).mockReturnValue({
      valid: true,
      parsed: { data: { wallets: [] } } as never,
    })
  })

  it('rejects unauthenticated restore requests', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: null, supabase: null, authType: null, error: new Error('unauthorized'),
    })
    const response = await restorePost(request('https://example.test/api/restore', {} ) as never)
    expect(response.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('uses the Bearer-authenticated owner for restore RPC even if backup contains another user id', async () => {
    const req = request('https://example.test/api/restore', { format: 'backup', user_id: 'attacker' })
    const response = await restorePost(req as never)
    expect(response.status).toBe(200)
    expect(getAuthenticatedUser).toHaveBeenCalledWith(req)
    expect(rpc).toHaveBeenCalledWith('restore_user_data', expect.objectContaining({ p_user_id: user.id }))
  })

  it('authenticates URL import and rejects a redirect to loopback before fetching it', async () => {
    const req = request('https://example.test/api/import/url', { url: 'https://public.example/file.csv' })
    vi.mocked(fetchPinnedUrl).mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    }))

    const response = await importPost(req as never)
    expect(response.status).toBe(403)
    expect(getAuthenticatedUser).toHaveBeenCalledWith(req)
    expect(fetchPinnedUrl).toHaveBeenCalledTimes(1)
  })

  it('enforces the upstream content-length limit', async () => {
    vi.mocked(fetchPinnedUrl).mockResolvedValue(new Response(null, {
      status: 200,
      headers: { 'content-length': String(5 * 1024 * 1024 + 1) },
    }))
    const response = await importPost(request('https://example.test/api/import/url', {
      url: 'https://public.example/file.csv',
    }) as never)
    expect(response.status).toBe(400)

    vi.mocked(fetchPinnedUrl).mockResolvedValue(new Response(new Uint8Array(5 * 1024 * 1024 + 1), {
      status: 200,
    }))
    const streamedResponse = await importPost(request('https://example.test/api/import/url', {
      url: 'https://public.example/stream.csv',
    }) as never)
    expect(streamedResponse.status).toBe(400)
  })
})
