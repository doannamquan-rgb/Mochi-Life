/**
 * Mochi Life — Canonical Backup & Restore Engine
 * Supports versioned JSON export and validation for 23 user-owned tables.
 */

import { createClient } from '@/lib/supabase/client'
import { fetchAllRows } from '@/lib/supabase/fetchAllRows'

export const BACKUP_FORMAT = 'mochi-life-backup'
export const CURRENT_SCHEMA_VERSION = 1
export const APP_VERSION = '4.6.0'
export const STORAGE_NOTE = 'Database backup does not include uploaded binary files (avatar, weight photos, receipt images).'

export const BACKUP_TABLES = [
  'user_profiles',
  'weight_goals',
  'weight_logs',
  'fitness_goals',
  'exercise_logs',
  'hsk_courses',
  'hsk_lessons',
  'hsk_vocabulary',
  'hsk_grammar',
  'vocabulary_reviews',
  'grammar_reviews',
  'study_sessions',
  'study_goals',
  'expense_categories',
  'wallets',
  'recurring_transactions',
  'transactions',
  'budgets',
  'daily_checklists',
  'user_achievements',
  'weekly_reviews',
  'data_import_jobs',
  'user_xp_logs',
] as const

export type BackupTableName = (typeof BACKUP_TABLES)[number]

export interface MochiBackupPayload {
  format: typeof BACKUP_FORMAT
  schema_version: number
  app_version: string
  exported_at: string
  user_id?: string
  storage_note: string
  data: Record<string, any[]>
}

export interface BackupValidationResult {
  valid: boolean
  error?: string
  summary?: Record<string, number>
  totalRecords?: number
  parsed?: MochiBackupPayload
}

/**
 * Exports all 23 user-owned tables with pagination to bypass Supabase 1000-row limit.
 */
export async function generateFullBackup(userId: string): Promise<MochiBackupPayload> {
  const supabase = createClient()
  const data: Record<string, any[]> = {}

  for (const table of BACKUP_TABLES) {
    const res = await fetchAllRows<any>((from: number, to: number) => {
      return supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('id', { ascending: true })
        .range(from, to)
    })

    if (res.ok) {
      data[table] = res.data
    } else {
      // Fallback for tables without 'id' column or different structure
      const fallbackRes = await supabase.from(table).select('*').eq('user_id', userId)
      data[table] = fallbackRes.data || []
    }
  }

  // Also include achievements info for user_achievements code mapping
  if (data.user_achievements && data.user_achievements.length > 0) {
    const { data: globalAchievements } = await supabase.from('achievements').select('id, code')
    if (globalAchievements) {
      const codeMap = new Map((globalAchievements as Array<{ id: string, code: string }>).map((a) => [a.id, a.code]))
      data.user_achievements = data.user_achievements.map(ua => ({
        ...ua,
        achievement_code: codeMap.get(ua.achievement_id) || null,
      }))
    }
  }

  return {
    format: BACKUP_FORMAT,
    schema_version: CURRENT_SCHEMA_VERSION,
    app_version: APP_VERSION,
    exported_at: new Date().toISOString(),
    user_id: userId,
    storage_note: STORAGE_NOTE,
    data,
  }
}

/**
 * Validates a parsed backup JSON structure.
 */
export function validateBackupData(raw: unknown): BackupValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'File sao lưu không phải là định dạng JSON hợp lệ (´・ω・`)' }
  }

  const obj = raw as Record<string, any>

  // Check format marker
  if (obj.format !== BACKUP_FORMAT && obj.version !== '3.0.0') {
    return {
      valid: false,
      error: 'File này không phải là bản sao lưu của Mochi Life hoặc phiên bản không được hỗ trợ!',
    }
  }

  if (obj.schema_version && typeof obj.schema_version === 'number' && obj.schema_version > CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Bản sao lưu này có schema version ${obj.schema_version}, mới hơn phiên bản ứng dụng hiện tại (${CURRENT_SCHEMA_VERSION}). Vui lòng cập nhật Mochi Life trước!`,
    }
  }

  if (!obj.data || typeof obj.data !== 'object') {
    return { valid: false, error: 'File sao lưu không chứa dữ liệu hợp lệ (data section missing).' }
  }

  const summary: Record<string, number> = {}
  let totalRecords = 0

  for (const [key, val] of Object.entries(obj.data)) {
    if (Array.isArray(val)) {
      summary[key] = val.length
      totalRecords += val.length
    } else if (val && typeof val === 'object') {
      summary[key] = 1
      totalRecords += 1
    }
  }

  return {
    valid: true,
    summary,
    totalRecords,
    parsed: obj as MochiBackupPayload,
  }
}
