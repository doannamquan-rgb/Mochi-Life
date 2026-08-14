import { describe, it, expect } from 'vitest'
import { isPrivateIP, isSafeUrl } from '../../app/api/import/url/route'

describe('SSRF Protection - isPrivateIP', () => {
  it('detects IPv4 loopback (127.0.0.0/8)', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true)
    expect(isPrivateIP('127.255.255.255')).toBe(true)
  })

  it('detects IPv4 private Class A (10.0.0.0/8)', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true)
    expect(isPrivateIP('10.254.1.1')).toBe(true)
  })

  it('detects IPv4 private Class B (172.16.0.0/12)', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true)
    expect(isPrivateIP('172.31.255.255')).toBe(true)
    expect(isPrivateIP('172.32.0.1')).toBe(false) // public
  })

  it('detects IPv4 private Class C (192.168.0.0/16)', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true)
    expect(isPrivateIP('192.168.0.254')).toBe(true)
  })

  it('detects AWS metadata & link-local (169.254.169.254)', () => {
    expect(isPrivateIP('169.254.169.254')).toBe(true)
    expect(isPrivateIP('169.254.1.1')).toBe(true)
  })

  it('detects 0.0.0.0', () => {
    expect(isPrivateIP('0.0.0.0')).toBe(true)
  })

  it('detects IPv6 loopback (::1)', () => {
    expect(isPrivateIP('::1')).toBe(true)
  })

  it('detects IPv4-mapped IPv6 private addresses', () => {
    expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIP('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateIP('::ffff:169.254.169.254')).toBe(true)
    expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false) // public
  })

  it('allows valid public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false)
    expect(isPrivateIP('1.1.1.1')).toBe(false)
    expect(isPrivateIP('104.244.42.1')).toBe(false)
  })
})

describe('SSRF Protection - isSafeUrl', () => {
  it('rejects invalid URL formats', async () => {
    const res = await isSafeUrl('not a url')
    expect(res.isSafe).toBe(false)
  })

  it('rejects non-HTTP/HTTPS protocols (file:, ftp:, javascript:)', async () => {
    expect((await isSafeUrl('file:///etc/passwd')).isSafe).toBe(false)
    expect((await isSafeUrl('ftp://example.com/data')).isSafe).toBe(false)
    expect((await isSafeUrl('javascript:alert(1)')).isSafe).toBe(false)
  })

  it('rejects embedded credentials in URL', async () => {
    const res = await isSafeUrl('http://user:pass@example.com')
    expect(res.isSafe).toBe(false)
    expect(res.error).toContain('không được chứa thông tin đăng nhập')
  })

  it('rejects localhost and loopback hostnames', async () => {
    expect((await isSafeUrl('http://localhost:3000')).isSafe).toBe(false)
    expect((await isSafeUrl('http://127.0.0.1:8080')).isSafe).toBe(false)
    expect((await isSafeUrl('http://app.local')).isSafe).toBe(false)
    expect((await isSafeUrl('http://internal.service.internal')).isSafe).toBe(false)
  })

  it('allows safe public URLs', async () => {
    const res = await isSafeUrl('https://raw.githubusercontent.com/example/repo/main/data.csv')
    expect(res.isSafe).toBe(true)
  })
})
