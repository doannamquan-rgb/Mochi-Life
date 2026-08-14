import { createClient } from '@/lib/supabase/client'
import type { RecurringTransaction } from '@/lib/types'
import { todayString } from '@/lib/date-utils'

export async function syncRecurringTransactions(userId: string): Promise<number> {
  const supabase = createClient()
  const todayStr = todayString()

  try {
    // 1. Fetch active recurring transactions due today or in the past
    const { data: recurringList, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('next_due_date', todayStr)

    if (error || !recurringList || recurringList.length === 0) return 0

    let createdCount = 0

    for (const rec of recurringList as RecurringTransaction[]) {
      let currentDate = new Date(rec.next_due_date)
      const todayDate = new Date(todayStr)
      let hasError = false

      while (currentDate <= todayDate) {
        const dateStr = currentDate.toISOString().split('T')[0]

        // Try inserting transaction idempotently
        const { data: inserted, error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: rec.type,
            amount: Math.abs(rec.amount),
            transaction_date: dateStr,
            category_id: rec.category_id,
            wallet_id: rec.wallet_id,
            description: rec.description,
            note: rec.note || 'Giao dịch tự động từ lịch định kỳ',
            recurring_id: rec.id,
            occurrence_date: dateStr,
          })
          .select()
          .single()

        if (insertError) {
          if (insertError.code === '23505') {
            // Unique violation, already exists. Safe to continue.
          } else {
            console.error('Error inserting recurring transaction:', insertError)
            hasError = true
            break
          }
        } else if (inserted) {
          createdCount++
        }

        // Calculate next occurrence date
        currentDate = calculateNextDueDate(currentDate, rec.frequency, rec.anchor_day, rec.anchor_month)
      }

      if (hasError) {
        continue
      }

      // Update recurring transaction's next_due_date
      const nextDueStr = currentDate.toISOString().split('T')[0]
      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({ next_due_date: nextDueStr })
        .eq('id', rec.id)

      if (updateError) {
        console.error('Error updating recurring transaction next_due_date:', updateError)
      }
    }

    return createdCount
  } catch (e) {
    console.error('Error syncing recurring transactions:', e)
    return 0
  }
}

export function calculateNextDueDate(
  fromDate: Date, 
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly', 
  anchorDay?: number | null, 
  anchorMonth?: number | null
): Date {
  const next = new Date(fromDate)
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (frequency === 'monthly') {
    const originalDay = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    
    const targetDay = anchorDay || originalDay
    const maxDaysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(targetDay, maxDaysInTargetMonth))
  } else if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
    if (anchorDay && anchorMonth) {
      next.setDate(1)
      next.setMonth(anchorMonth - 1)
      const maxDaysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(anchorDay, maxDaysInTargetMonth))
    }
  }
  return next
}
