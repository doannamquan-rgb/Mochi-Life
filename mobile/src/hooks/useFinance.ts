import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { queryKeys } from '../lib/query-keys'
import { parseAndValidateVNDAmount, calculateWalletBalance, calculateTotalWalletBalance, todayString } from '@mochi/shared'
import type { Wallet, ExpenseCategory, Transaction, Budget, CreateTransactionAtomicInput, WalletBalanceSnapshot } from '@mochi/shared'

export function useFinance() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const startOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const lastDay = new Date(currentYear, currentMonth, 0).getDate()
  const endOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // 1. Wallets
  const walletsQuery = useQuery({
    queryKey: queryKeys.wallets(userId),
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

  // 1b. Wallet Snapshots
  const snapshotsQuery = useQuery({
    queryKey: ['wallet-snapshots', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_balance_snapshots')
        .select('*')
        .eq('user_id', userId!)
        .order('as_of_date', { ascending: false })
      if (error) return []
      return (data || []) as WalletBalanceSnapshot[]
    },
  })

  // 2. Categories
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(userId),
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

  // 3. Recent Transactions (for UI list)
  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions(userId),
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
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data || []) as Transaction[]
    },
  })

  // 4. Monthly Transactions (Dedicated query for accurate monthly aggregates, no 50-item truncation)
  const monthlyAggregatesQuery = useQuery({
    queryKey: ['monthly-tx-aggregates', userId, currentMonth, currentYear],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId!)
        .gte('transaction_date', startOfMonthStr)
        .lte('transaction_date', endOfMonthStr)
      if (error) throw error
      return (data || []) as Array<{ type: 'expense' | 'income'; amount: number }>
    },
  })

  // 5. Monthly Budgets
  const budgetsQuery = useQuery({
    queryKey: queryKeys.budgets(userId, currentMonth, currentYear),
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

  // 6. Atomic Add Transaction Mutation (PostgreSQL RPC)
  const addTransactionMutation = useMutation({
    mutationFn: async (input: CreateTransactionAtomicInput) => {
      if (!userId) throw new Error('Chưa đăng nhập')

      const validation = parseAndValidateVNDAmount(input.amount)
      if (!validation.valid || validation.value <= 0) {
        throw new Error(validation.error || 'Số tiền không hợp lệ')
      }

      // Execute atomic PostgreSQL RPC
      const { data, error } = await supabase.rpc('record_transaction_atomic', {
        p_user_id: userId,
        p_type: input.type,
        p_amount: validation.value,
        p_transaction_date: input.transaction_date,
        p_wallet_id: input.wallet_id || null,
        p_category_id: input.category_id || null,
        p_description: input.description?.trim() || null,
        p_note: input.note?.trim() || null,
        p_payment_method: input.payment_method || null,
      })

      if (error) {
        // Fallback to direct client transaction insert + wallet update if RPC is not yet deployed on DB
        if (error.message?.includes('function public.record_transaction_atomic') || error.code === '42883') {
          const { data: directTx, error: directErr } = await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              type: input.type,
              amount: validation.value,
              transaction_date: input.transaction_date,
              wallet_id: input.wallet_id || null,
              category_id: input.category_id || null,
              description: input.description?.trim() || null,
              note: input.note?.trim() || null,
            })
            .select()
            .single()

          if (directErr) throw directErr

          if (input.wallet_id) {
            const delta = input.type === 'income' ? validation.value : -validation.value
            const targetWallet = walletsQuery.data?.find(w => w.id === input.wallet_id)
            if (targetWallet) {
              await supabase
                .from('wallets')
                .update({ balance: (targetWallet.balance || 0) + delta })
                .eq('id', input.wallet_id)
            }
          }
          return directTx
        }
        throw new Error(error.message || 'Không thể tạo giao dịch')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
      queryClient.invalidateQueries({ queryKey: ['monthly-tx-aggregates', userId] })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
    },
  })

  // 7. Atomic Delete Transaction Mutation (PostgreSQL RPC)
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      if (!userId) throw new Error('Chưa đăng nhập')

      const { data, error } = await supabase.rpc('delete_transaction_atomic', {
        p_user_id: userId,
        p_transaction_id: transactionId,
      })

      if (error) {
        // Fallback for direct delete if RPC not present
        if (error.message?.includes('delete_transaction_atomic') || error.code === '42883') {
          const txToDelete = transactionsQuery.data?.find(t => t.id === transactionId)
          if (txToDelete && txToDelete.wallet_id) {
            const reverseDelta = txToDelete.type === 'expense' ? txToDelete.amount : -txToDelete.amount
            const targetWallet = walletsQuery.data?.find(w => w.id === txToDelete.wallet_id)
            if (targetWallet) {
              await supabase
                .from('wallets')
                .update({ balance: (targetWallet.balance || 0) + reverseDelta })
                .eq('id', txToDelete.wallet_id)
            }
          }
          const { error: delErr } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId)
            .eq('user_id', userId)
          if (delErr) throw delErr
          return true
        }
        throw new Error(error.message || 'Không thể xóa giao dịch')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
      queryClient.invalidateQueries({ queryKey: ['monthly-tx-aggregates', userId] })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets(userId) })
      queryClient.invalidateQueries({ queryKey: ['wallet-snapshots', userId] })
    },
  })

  // 6. Adjust Wallet Balance Mutation (creates balance snapshot)
  const adjustWalletBalanceMutation = useMutation({
    mutationFn: async ({
      walletId,
      balance,
      asOfDate,
    }: {
      walletId: string
      balance: number
      asOfDate?: string
    }) => {
      if (!userId) throw new Error('Chưa đăng nhập')
      const targetDate = asOfDate || todayString()

      const { data, error } = await supabase
        .from('wallet_balance_snapshots')
        .insert({
          wallet_id: walletId,
          user_id: userId,
          balance,
          as_of_date: targetDate,
        })
        .select()
        .single()
      if (error) throw error

      // Update wallets.balance as well
      await supabase.from('wallets').update({ balance }).eq('id', walletId)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-snapshots', userId] })
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
    },
  })

  // 7. Add Wallet Mutation
  const addWalletMutation = useMutation({
    mutationFn: async ({
      name,
      type,
      icon,
      balance,
    }: {
      name: string
      type?: 'cash' | 'bank' | 'ewallet' | 'credit_card' | 'other'
      icon?: string
      balance?: number
    }) => {
      if (!userId) throw new Error('Chưa đăng nhập')
      const initialBal = balance || 0

      const { data, error } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          name: name.trim(),
          type: type || 'bank',
          icon: icon || '🪙',
          balance: initialBal,
        })
        .select()
        .single()
      if (error) throw error

      if (initialBal !== 0 && data) {
        await supabase.from('wallet_balance_snapshots').insert({
          wallet_id: data.id,
          user_id: userId,
          balance: initialBal,
          as_of_date: todayString(),
        })
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
      queryClient.invalidateQueries({ queryKey: ['wallet-snapshots', userId] })
    },
  })

  const rawWallets = walletsQuery.data || []
  const snapshots = snapshotsQuery.data || []
  const transactions = transactionsQuery.data || []
  const today = todayString()

  // Dynamic wallet balance calculation using domain logic
  const computedWallets = rawWallets.map(w => ({
    ...w,
    balance: calculateWalletBalance(w, snapshots, transactions, today),
  }))

  const totalBalance = calculateTotalWalletBalance(rawWallets, snapshots, transactions, today)
  const monthlyItems = monthlyAggregatesQuery.data || []
  const monthExpense = monthlyItems
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const monthIncome = monthlyItems
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  return {
    wallets: computedWallets,
    categories: categoriesQuery.data || [],
    transactions,
    budgets: budgetsQuery.data || [],
    snapshots,
    totalBalance,
    monthExpense,
    monthIncome,
    loading: walletsQuery.isLoading || transactionsQuery.isLoading || snapshotsQuery.isLoading,
    addTransaction: addTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    adjustWalletBalance: adjustWalletBalanceMutation.mutateAsync,
    addWallet: addWalletMutation.mutateAsync,
    refetch: async () => {
      await Promise.all([
        walletsQuery.refetch(),
        snapshotsQuery.refetch(),
        categoriesQuery.refetch(),
        transactionsQuery.refetch(),
        monthlyAggregatesQuery.refetch(),
        budgetsQuery.refetch(),
      ])
    },
  }
}
