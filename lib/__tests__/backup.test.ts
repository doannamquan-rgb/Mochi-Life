import { describe, it, expect } from 'vitest'
import { validateBackupData, BACKUP_FORMAT, CURRENT_SCHEMA_VERSION, APP_VERSION } from '../backup'

describe('validateBackupData', () => {
  it('rejects null or non-object payloads', () => {
    expect(validateBackupData(null).valid).toBe(false)
    expect(validateBackupData('string').valid).toBe(false)
    expect(validateBackupData(123).valid).toBe(false)
  })

  it('rejects payloads with wrong format marker', () => {
    const invalid = {
      format: 'unknown-format',
      schema_version: 1,
      data: {},
    }
    const res = validateBackupData(invalid)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('không phải là bản sao lưu của Mochi Life')
  })

  it('rejects payloads with schema_version newer than supported', () => {
    const future = {
      format: BACKUP_FORMAT,
      schema_version: CURRENT_SCHEMA_VERSION + 1,
      data: {},
    }
    const res = validateBackupData(future)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('mới hơn phiên bản ứng dụng')
  })

  it('rejects payloads missing data property', () => {
    const missing = {
      format: BACKUP_FORMAT,
      schema_version: 1,
    }
    const res = validateBackupData(missing)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('data section missing')
  })

  it('successfully validates a valid full backup payload and computes summary counts', () => {
    const valid = {
      format: BACKUP_FORMAT,
      schema_version: CURRENT_SCHEMA_VERSION,
      app_version: APP_VERSION,
      exported_at: new Date().toISOString(),
      storage_note: 'note',
      data: {
        hsk_courses: [{ id: '1', name: 'Course 1' }, { id: '2', name: 'Course 2' }],
        hsk_vocabulary: [{ id: 'v1', hanzi: '你好' }],
        transactions: [],
      },
    }

    const res = validateBackupData(valid)
    expect(res.valid).toBe(true)
    expect(res.totalRecords).toBe(3)
    expect(res.summary).toEqual({
      hsk_courses: 2,
      hsk_vocabulary: 1,
      transactions: 0,
    })
  })

  it('accepts legacy version 3.0.0 backups', () => {
    const legacy = {
      version: '3.0.0',
      data: {
        hsk_courses: [{ id: '1' }],
      },
    }
    const res = validateBackupData(legacy)
    expect(res.valid).toBe(true)
    expect(res.totalRecords).toBe(1)
  })
})
