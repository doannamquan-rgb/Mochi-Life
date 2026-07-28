import { createClient } from '@/lib/supabase/client'
import type { RecurringTransaction } from '@/lib/types'

export async function syncRecurringTransactions(userId: string) {
  const supabase = createClient()
  const todayStr = new Date().toISOString().split('T')[0]

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

      while (currentDate <= todayDate) {
        const dateStr = currentDate.toISOString().split('T')[0]

        // Try inserting transaction idempotently
        const { data: inserted, error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: rec.type,
            amount: rec.amount,
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

        if (!insertError && inserted) {
          createdCount++
        }

        // Calculate next occurrence date
        currentDate = calculateNextDueDate(currentDate, rec.frequency)
      }

      // Update recurring transaction's next_due_date
      const nextDueStr = currentDate.toISOString().split('T')[0]
      await supabase
        .from('recurring_transactions')
        .update({ next_due_date: nextDueStr })
        .eq('id', rec.id)
    }

    return createdCount
  } catch (e) {
    console.error('Error syncing recurring transactions:', e)
    return 0
  }
}

export function calculateNextDueDate(fromDate: Date, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): Date {
  const next = new Date(fromDate)
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (frequency === 'monthly') {
    const originalDay = next.getDate()
    next.setMonth(next.getMonth() + 1)
    // Handle month end overflow (e.g., Jan 31 -> Feb 28)
    if (next.getDate() !== originalDay) {
      next.setDate(0)
    }
  } else if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  }
  return next
}
