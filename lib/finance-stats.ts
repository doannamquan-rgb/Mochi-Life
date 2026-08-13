import type { SupabaseClient } from '@supabase/supabase-js'
import type { Transaction, Budget, ExpenseCategory, RecurringTransaction } from '@/lib/types'
import { todayString } from '@/lib/date-utils'
import { fetchAllRows } from '@/lib/supabase/fetchAllRows'

export type FinanceStats = {
  incomeThisMonth: number
  expenseThisMonth: number
  balance: number
  incomePrevMonth: number
  expensePrevMonth: number
  expenseChangePercent: number | null
  incomeChangePercent: number | null
  topExpenseCategories: Array<{ name: string; icon: string; amount: number; percent: number }>
  topIncomeCategories: Array<{ name: string; icon: string; amount: number; percent: number }>
  budget: Budget | null
  budgetUsedPercent: number
  activeRecurringCount: number
  todayExpense: number
  todayIncome: number
  error: string | null
}

export async function fetchFinanceStats(
  supabase: SupabaseClient,
  userId: string,
  period?: any
): Promise<FinanceStats> {
  let fetchError: string | null = null
  const now = new Date()
  
  // Current month bounds
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // last day of month
  const currentMonthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const currentMonthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`

  // Previous month bounds
  let prevMonth = now.getMonth() - 1
  let prevYear = now.getFullYear()
  if (prevMonth < 0) {
    prevMonth = 11
    prevYear -= 1
  }
  const prevMonthStart = new Date(prevYear, prevMonth, 1)
  const prevMonthEnd = new Date(prevYear, prevMonth + 1, 0)
  const prevMonthStartStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
  const prevMonthEndStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevMonthEnd.getDate()).padStart(2, '0')}`

  const todayStr = todayString()

  const [
    transactionsRes,
    categoriesRes,
    budgetsRes,
    recurringRes
  ] = await Promise.all([
    // 1. Transactions for current and prev month
    fetchAllRows<Transaction>((from, to) => 
      supabase.from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('transaction_date', prevMonthStartStr)
        .lte('transaction_date', currentMonthEndStr)
        .range(from, to)
    ),
    // 2. Expense Categories
    fetchAllRows<ExpenseCategory>((from, to) => 
      supabase.from('expense_categories')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .range(from, to)
    ),
    // 3. Current month budget
    supabase.from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .eq('is_total_budget', true)
      .maybeSingle(),
    // 4. Recurring transactions (active)
    fetchAllRows<RecurringTransaction>((from, to) => 
      supabase.from('recurring_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true)
        .range(from, to)
    )
  ])

  if (!transactionsRes.ok) fetchError = transactionsRes.error.message
  if (!categoriesRes.ok) fetchError = fetchError ? `${fetchError}; ${categoriesRes.error.message}` : categoriesRes.error.message
  if (budgetsRes.error) fetchError = fetchError ? `${fetchError}; ${budgetsRes.error.message}` : budgetsRes.error.message
  if (!recurringRes.ok) fetchError = fetchError ? `${fetchError}; ${recurringRes.error.message}` : recurringRes.error.message

  if (fetchError) {
    return {
      incomeThisMonth: 0,
      expenseThisMonth: 0,
      balance: 0,
      incomePrevMonth: 0,
      expensePrevMonth: 0,
      expenseChangePercent: null,
      incomeChangePercent: null,
      topExpenseCategories: [],
      topIncomeCategories: [],
      budget: null,
      budgetUsedPercent: 0,
      activeRecurringCount: 0,
      todayExpense: 0,
      todayIncome: 0,
      error: fetchError
    }
  }

  const transactions = transactionsRes.ok ? transactionsRes.data : []
  const categories = categoriesRes.ok ? categoriesRes.data : []
  const budget = budgetsRes.data ?? null
  const activeRecurringCount = recurringRes.ok ? recurringRes.data.length : 0

  const categoryMap = new Map<string, ExpenseCategory>()
  categories.forEach(c => categoryMap.set(c.id, c))

  let incomeThisMonth = 0
  let expenseThisMonth = 0
  let incomePrevMonth = 0
  let expensePrevMonth = 0
  let todayExpense = 0
  let todayIncome = 0

  const expenseCategoriesThisMonth = new Map<string, number>()
  const incomeCategoriesThisMonth = new Map<string, number>()

  transactions.forEach(t => {
    const isThisMonth = t.transaction_date >= currentMonthStartStr && t.transaction_date <= currentMonthEndStr
    const isPrevMonth = t.transaction_date >= prevMonthStartStr && t.transaction_date <= prevMonthEndStr
    const isToday = t.transaction_date === todayStr

    if (t.type === 'expense') {
      if (isThisMonth) {
        expenseThisMonth += t.amount
        if (t.category_id) {
          expenseCategoriesThisMonth.set(t.category_id, (expenseCategoriesThisMonth.get(t.category_id) || 0) + t.amount)
        }
      }
      if (isPrevMonth) expensePrevMonth += t.amount
      if (isToday) todayExpense += t.amount
    } else if (t.type === 'income') {
      if (isThisMonth) {
        incomeThisMonth += t.amount
        if (t.category_id) {
          incomeCategoriesThisMonth.set(t.category_id, (incomeCategoriesThisMonth.get(t.category_id) || 0) + t.amount)
        }
      }
      if (isPrevMonth) incomePrevMonth += t.amount
      if (isToday) todayIncome += t.amount
    }
  })

  const balance = incomeThisMonth - expenseThisMonth

  let expenseChangePercent: number | null = null
  if (expensePrevMonth > 0) {
    expenseChangePercent = ((expenseThisMonth - expensePrevMonth) / expensePrevMonth) * 100
  }

  let incomeChangePercent: number | null = null
  if (incomePrevMonth > 0) {
    incomeChangePercent = ((incomeThisMonth - incomePrevMonth) / incomePrevMonth) * 100
  }

  let budgetUsedPercent = 0
  if (budget && budget.amount > 0) {
    budgetUsedPercent = (expenseThisMonth / budget.amount) * 100
  }

  const mapToTopCategories = (catMap: Map<string, number>, total: number) => {
    const arr = Array.from(catMap.entries()).map(([id, amount]) => {
      const cat = categoryMap.get(id)
      return {
        name: cat?.name || 'Unknown',
        icon: cat?.icon || '📦',
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0
      }
    })
    return arr.sort((a, b) => b.amount - a.amount).slice(0, 5)
  }

  const topExpenseCategories = mapToTopCategories(expenseCategoriesThisMonth, expenseThisMonth)
  const topIncomeCategories = mapToTopCategories(incomeCategoriesThisMonth, incomeThisMonth)

  return {
    incomeThisMonth,
    expenseThisMonth,
    balance,
    incomePrevMonth,
    expensePrevMonth,
    expenseChangePercent,
    incomeChangePercent,
    topExpenseCategories,
    topIncomeCategories,
    budget,
    budgetUsedPercent,
    activeRecurringCount,
    todayExpense,
    todayIncome,
    error: null
  }
}
