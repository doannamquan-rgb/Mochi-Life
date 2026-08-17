import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import type { Wallet, ExpenseCategory, Transaction, Budget } from '@mochi/shared'

export function useFinance() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // 1. Wallets
  const walletsQuery = useQuery({
    queryKey: ['wallets', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as Wallet[]
    },
  })

  // 2. Categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', userId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data || []) as ExpenseCategory[]
    },
  })

  // 3. Transactions
  const transactionsQuery = useQuery({
    queryKey: ['transactions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:expense_categories(*),
          wallet:wallets(*)
        `)
        .eq('user_id', userId!)
        .order('transaction_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data || []) as Transaction[]
    },
  })

  // 4. Monthly Budgets
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const budgetsQuery = useQuery({
    queryKey: ['budgets', userId, currentMonth, currentYear],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:expense_categories(*)
        `)
        .eq('user_id', userId!)
        .eq('month', currentMonth)
        .eq('year', currentYear)
      if (error) throw error
      return (data || []) as Budget[]
    },
  })

  // 5. Add Transaction Mutation
  const addTransactionMutation = useMutation({
    mutationFn: async (newTx: {
      type: 'expense' | 'income'
      amount: number
      transaction_date: string
      category_id?: string
      wallet_id?: string
      description?: string
      note?: string
    }) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId!,
          ...newTx,
        })
        .select()
        .single()
      if (error) throw error

      // Update wallet balance
      if (newTx.wallet_id) {
        const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount
        const targetWallet = walletsQuery.data?.find(w => w.id === newTx.wallet_id)
        if (targetWallet) {
          await supabase
            .from('wallets')
            .update({ balance: (targetWallet.balance || 0) + delta })
            .eq('id', newTx.wallet_id)
        }
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['wallets', userId] })
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] })
    },
  })

  // Calculate stats
  const totalBalance = (walletsQuery.data || []).reduce((sum, w) => sum + (w.balance || 0), 0)
  const currentMonthTransactions = (transactionsQuery.data || []).filter(t => {
    const d = new Date(t.transaction_date)
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
  })
  const monthExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const monthIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    wallets: walletsQuery.data || [],
    categories: categoriesQuery.data || [],
    transactions: transactionsQuery.data || [],
    budgets: budgetsQuery.data || [],
    totalBalance,
    monthExpense,
    monthIncome,
    loading: walletsQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: addTransactionMutation.mutateAsync,
    refetch: () => {
      walletsQuery.refetch()
      categoriesQuery.refetch()
      transactionsQuery.refetch()
      budgetsQuery.refetch()
    },
  }
}
