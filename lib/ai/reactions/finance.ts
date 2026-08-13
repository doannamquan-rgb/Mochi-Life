import type { SupabaseClient } from '@supabase/supabase-js'
import { todayString } from '@/lib/date-utils'
import type { FinanceTransactionReactionFacts } from './types'

export async function buildFinanceReactionFacts(
  supabase: SupabaseClient,
  userId: string,
  transactionType: 'expense' | 'income'
): Promise<FinanceTransactionReactionFacts | null> {
  const today = todayString()
  const now = new Date()

  // Current month bounds
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  const daysRemainingInMonth = daysInMonth - now.getDate()

  const [latestTxRes, monthTxRes, categoriesRes, budgetRes] = await Promise.all([
    // Latest transaction just saved
    supabase
      .from('transactions')
      .select('*, category:expense_categories(*)')
      .eq('user_id', userId)
      .eq('type', transactionType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // All transactions this month
    supabase
      .from('transactions')
      .select('type, amount, category_id, transaction_date')
      .eq('user_id', userId)
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd),
    // Categories lookup
    supabase
      .from('expense_categories')
      .select('id, name, icon')
      .eq('user_id', userId),
    // Total budget for this month
    supabase
      .from('budgets')
      .select('amount, category_id')
      .eq('user_id', userId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .eq('is_total_budget', true)
      .maybeSingle(),
  ])

  if (latestTxRes.error || !latestTxRes.data) return null

  const latest = latestTxRes.data
  const monthTx = monthTxRes.data ?? []
  const categories = categoriesRes.data ?? []
  const budget = budgetRes.data ?? null

  // Build category map
  const categoryMap = new Map<string, { name: string; icon: string }>()
  categories.forEach((c: any) => categoryMap.set(c.id, { name: c.name, icon: c.icon }))

  // Monthly aggregates
  let expenseThisMonth = 0
  let incomeThisMonth = 0
  const categorySpendMap = new Map<string, number>()

  monthTx.forEach((t: any) => {
    if (t.type === 'expense') {
      expenseThisMonth += t.amount
      if (t.category_id) {
        categorySpendMap.set(t.category_id, (categorySpendMap.get(t.category_id) ?? 0) + t.amount)
      }
    } else if (t.type === 'income') {
      incomeThisMonth += t.amount
    }
  })

  const balance = incomeThisMonth - expenseThisMonth

  // Previous month for change percent
  let prevMonth = now.getMonth() - 1
  let prevYear = now.getFullYear()
  if (prevMonth < 0) {
    prevMonth = 11
    prevYear -= 1
  }
  const prevMonthStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
  const prevMonthEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(daysInPrevMonth).padStart(2, '0')}`

  const prevMonthRes = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('transaction_date', prevMonthStart)
    .lte('transaction_date', prevMonthEnd)
  const prevTx = prevMonthRes.data ?? []
  const expensePrevMonth = prevTx.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0)
  const incomePrevMonth = prevTx.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0)

  const expenseChangePercent = expensePrevMonth > 0
    ? ((expenseThisMonth - expensePrevMonth) / expensePrevMonth) * 100
    : null

  // Category-level spend + budget
  const latestCategoryId = latest.category_id ?? null
  const latestCategory = latestCategoryId ? categoryMap.get(latestCategoryId) : null
  const categorySpendThisMonth = latestCategoryId ? (categorySpendMap.get(latestCategoryId) ?? null) : null

  // Category-specific budget
  let categoryBudget: number | null = null
  let categoryBudgetUsedPercent: number | null = null
  if (latestCategoryId) {
    const catBudgetRes = await supabase
      .from('budgets')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', latestCategoryId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .eq('is_total_budget', false)
      .maybeSingle()
    if (catBudgetRes.data?.amount) {
      categoryBudget = catBudgetRes.data.amount
      const budgetAmount = catBudgetRes.data.amount // truthy/non-null guaranteed here
      categoryBudgetUsedPercent = categorySpendThisMonth !== null && budgetAmount > 0
        ? (categorySpendThisMonth / budgetAmount) * 100
        : null
    }
  }

  // Total budget
  const totalBudget = budget?.amount ?? null
  const totalUsedPercent = totalBudget && totalBudget > 0 ? (expenseThisMonth / totalBudget) * 100 : null

  return {
    eventType: transactionType === 'expense' ? 'transaction_expense_created' : 'transaction_income_created',
    action: {
      amount: latest.amount,
      type: transactionType,
      categoryName: latestCategory?.name ?? null,
      categoryIcon: latestCategory?.icon ?? null,
    },
    monthly: {
      expenseThisMonth,
      incomeThisMonth,
      balance,
      expensePrevMonth,
      incomePrevMonth,
      expenseChangePercent,
    },
    category: {
      categorySpendThisMonth,
      categoryBudget,
      categoryBudgetUsedPercent,
    },
    budget: {
      totalBudget,
      totalUsedPercent,
      daysRemainingInMonth,
    },
    milestones: {
      budgetExceeded: !!(totalUsedPercent && totalUsedPercent >= 100),
      categoryBudgetNearLimit: !!(categoryBudgetUsedPercent && categoryBudgetUsedPercent >= 80),
    },
    projection: null,
  }
}
