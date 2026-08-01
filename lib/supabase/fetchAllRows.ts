import type { SupabaseClient } from '@supabase/supabase-js'

export type FetchAllRowsResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; error: Error }

/**
 * Fetch ALL rows from a Supabase query builder using .range() pagination.
 *
 * Requirements:
 * - Requires `T extends { id: string }`.
 * - Advances offset using actual rows returned (`offset += rows.length`).
 * - Uses `count: 'exact'` from server query response.
 * - Verifies total unique accumulated rows against server total count.
 * - Retries the entire fetch once if dataset consistency check fails.
 * - Returns `{ ok: false, error }` atomically on any failure (never returns partial data).
 * - Detects non-progress iterations to prevent infinite loops.
 */
export async function fetchAllRows<T extends { id: string }>(
  queryFactory: (rangeFrom: number, rangeTo: number) => PromiseLike<{
    data: T[] | null
    error: any
    count?: number | null
  }>,
  requestedPageSize = 500
): Promise<FetchAllRowsResult<T>> {
  let attempt = 0
  const maxAttempts = 2

  while (attempt < maxAttempts) {
    attempt++
    const accumulatedRows: T[] = []
    const uniqueIds = new Set<string>()
    let offset = 0
    let expectedCount: number | null = null
    let hasError = false
    let fetchError: Error | null = null

    while (true) {
      const rangeTo = offset + requestedPageSize - 1
      const res = await queryFactory(offset, rangeTo)

      if (res.error) {
        hasError = true
        fetchError = new Error(
          typeof res.error === 'string'
            ? res.error
            : res.error.message ?? 'Lỗi tải dữ liệu batch'
        )
        break
      }

      if (res.count !== undefined && res.count !== null && expectedCount === null) {
        expectedCount = res.count
      }

      const rows = res.data ?? []
      if (rows.length === 0) {
        break
      }

      let newUniqueInBatch = 0
      for (const row of rows) {
        const id = row.id
        if (!uniqueIds.has(id)) {
          uniqueIds.add(id)
          accumulatedRows.push(row)
          newUniqueInBatch++
        }
      }

      // Advance offset by ACTUAL rows returned by server
      offset += rows.length

      // Detect non-progress
      if (newUniqueInBatch === 0 && rows.length > 0) {
        hasError = true
        fetchError = new Error('Lỗi đồng bộ dữ liệu: Không có tiến trình mới')
        break
      }

      if (expectedCount !== null && accumulatedRows.length >= expectedCount) {
        break
      }
    }

    if (hasError) {
      if (attempt < maxAttempts) continue
      return { ok: false, error: fetchError! }
    }

    // Consistency verification
    if (expectedCount !== null && accumulatedRows.length !== expectedCount) {
      if (attempt < maxAttempts) continue
      return {
        ok: false,
        error: new Error(
          `Lỗi không nhất quán dữ liệu: Kỳ vọng ${expectedCount} bản ghi, nhận được ${accumulatedRows.length}`
        )
      }
    }

    return { ok: true, data: accumulatedRows }
  }

  return { ok: false, error: new Error('Tải dữ liệu thất bại sau 2 lần thử') }
}
