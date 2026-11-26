import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/017_wallet_snapshot_rls_repair.sql', 'utf8')

describe('wallet snapshot repair migration', () => {
  it('uses valid quoted dollar blocks and idempotent policy replacement', () => {
    expect(migration).toContain('DO $repair$')
    expect(migration).toContain('END;\n$repair$;')
    expect(migration).toContain('DO $publication$')
    expect(migration).toContain('DROP POLICY %I')
  })

  it('checks both snapshot owner and wallet owner for every operation', () => {
    expect(migration.match(/auth\.uid\(\) = user_id AND EXISTS/g)).toHaveLength(5)
    expect(migration.match(/w\.user_id = auth\.uid\(\)/g)).toHaveLength(5)
    expect(migration).toContain('FOR SELECT')
    expect(migration).toContain('FOR INSERT')
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain('FOR DELETE')
  })

  it('keeps multiple same-day balance adjustments as an audit trail', () => {
    expect(migration).not.toMatch(/UNIQUE\s*\(\s*wallet_id\s*,\s*as_of_date/i)
    expect(migration).toContain('created_at DESC')
  })
})
