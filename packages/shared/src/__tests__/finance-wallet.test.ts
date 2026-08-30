import { describe, it, expect } from 'vitest'
import { calculateWalletBalance, calculateTotalWalletBalance } from '../finance'
import type { Wallet, WalletBalanceSnapshot, Transaction } from '../types'

describe('calculateWalletBalance — Time-based Wallet Balance & Snapshot Calculation', () => {
  const mockWallet: Wallet = {
    id: 'wallet-1',
    user_id: 'user-1',
    name: 'Ví chính',
    type: 'bank',
    balance: 5000000,
    icon: '💳',
    color: '#FF7A5C',
    is_default: true,
    is_sample_data: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  it('1. Returns wallet.balance when no snapshots exist', () => {
    const balance = calculateWalletBalance(mockWallet, [], [])
    expect(balance).toBe(5000000)
  })

  it('2. Returns snapshot.balance when snapshot exists and no subsequent transactions occurred', () => {
    const snapshots: WalletBalanceSnapshot[] = [
      {
        id: 'snap-1',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 10000000,
        as_of_date: '2026-08-01',
        created_at: '2026-08-01T10:00:00Z',
      },
    ]

    const balance = calculateWalletBalance(mockWallet, snapshots, [], '2026-08-15')
    expect(balance).toBe(10000000)
  })

  it('3. Accurately adds income and subtracts expenses after the snapshot date', () => {
    const snapshots: WalletBalanceSnapshot[] = [
      {
        id: 'snap-1',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 10000000,
        as_of_date: '2026-08-01',
        created_at: '2026-08-01T10:00:00Z',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        type: 'expense',
        amount: 200000,
        transaction_date: '2026-08-02',
        transaction_time: null,
        category_id: null,
        payment_method: null,
        description: 'Ăn trưa',
        note: null,
        receipt_url: null,
        recurring_id: null,
        occurrence_date: null,
        is_sample_data: false,
        created_at: '2026-08-02T12:00:00Z',
        updated_at: '2026-08-02T12:00:00Z',
      },
      {
        id: 'tx-2',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        type: 'income',
        amount: 1500000,
        transaction_date: '2026-08-05',
        transaction_time: null,
        category_id: null,
        payment_method: null,
        description: 'Freelance',
        note: null,
        receipt_url: null,
        recurring_id: null,
        occurrence_date: null,
        is_sample_data: false,
        created_at: '2026-08-05T10:00:00Z',
        updated_at: '2026-08-05T10:00:00Z',
      },
      {
        id: 'tx-3',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        type: 'expense',
        amount: 500000,
        transaction_date: '2026-08-10',
        transaction_time: null,
        category_id: null,
        payment_method: null,
        description: 'Mua sắm',
        note: null,
        receipt_url: null,
        recurring_id: null,
        occurrence_date: null,
        is_sample_data: false,
        created_at: '2026-08-10T15:00:00Z',
        updated_at: '2026-08-10T15:00:00Z',
      },
    ]

    // 10,000,000 - 200,000 + 1,500,000 - 500,000 = 10,800,000
    const balance = calculateWalletBalance(mockWallet, snapshots, transactions, '2026-08-15')
    expect(balance).toBe(10800000)
  })

  it('4. Selects the closest snapshot on or before atDate when multiple snapshots exist', () => {
    const snapshots: WalletBalanceSnapshot[] = [
      {
        id: 'snap-1',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 5000000,
        as_of_date: '2026-07-01',
        created_at: '2026-07-01T10:00:00Z',
      },
      {
        id: 'snap-2',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 8000000,
        as_of_date: '2026-08-01',
        created_at: '2026-08-01T10:00:00Z',
      },
      {
        id: 'snap-3',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 12000000,
        as_of_date: '2026-09-01',
        created_at: '2026-09-01T10:00:00Z',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        type: 'expense',
        amount: 300000,
        transaction_date: '2026-08-10',
        transaction_time: null,
        category_id: null,
        payment_method: null,
        description: 'Cà phê',
        note: null,
        receipt_url: null,
        recurring_id: null,
        occurrence_date: null,
        is_sample_data: false,
        created_at: '2026-08-10T10:00:00Z',
        updated_at: '2026-08-10T10:00:00Z',
      },
    ]

    // At 2026-08-15: Uses snap-2 (8,000,000) - tx-1 (300,000) = 7,700,000
    const balanceAug = calculateWalletBalance(mockWallet, snapshots, transactions, '2026-08-15')
    expect(balanceAug).toBe(7700000)

    // At 2026-07-15: Uses snap-1 (5,000,000) and ignores tx-1 which was in August
    const balanceJul = calculateWalletBalance(mockWallet, snapshots, transactions, '2026-07-15')
    expect(balanceJul).toBe(5000000)
  })

  it('5. Ignores transactions before the snapshot date (snapshot acts as definitive reconciliation anchor)', () => {
    const snapshots: WalletBalanceSnapshot[] = [
      {
        id: 'snap-2',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 7000000,
        as_of_date: '2026-08-01',
        created_at: '2026-08-01T10:00:00Z',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 'tx-old',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        type: 'expense',
        amount: 9999999,
        transaction_date: '2026-07-20',
        transaction_time: null,
        category_id: null,
        payment_method: null,
        description: 'Old expense',
        note: null,
        receipt_url: null,
        recurring_id: null,
        occurrence_date: null,
        is_sample_data: false,
        created_at: '2026-07-20T10:00:00Z',
        updated_at: '2026-07-20T10:00:00Z',
      },
      {
        id: 'tx-new',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        type: 'income',
        amount: 500000,
        transaction_date: '2026-08-02',
        transaction_time: null,
        category_id: null,
        payment_method: null,
        description: 'New income',
        note: null,
        receipt_url: null,
        recurring_id: null,
        occurrence_date: null,
        is_sample_data: false,
        created_at: '2026-08-02T10:00:00Z',
        updated_at: '2026-08-02T10:00:00Z',
      },
    ]

    // 7,000,000 + 500,000 = 7,500,000 (old tx on 2026-07-20 does NOT affect the snapshot)
    const balance = calculateWalletBalance(mockWallet, snapshots, transactions, '2026-08-05')
    expect(balance).toBe(7500000)
  })

  it('6. Correctly calculates total wallet balance across multiple wallets', () => {
    const wallet2: Wallet = {
      ...mockWallet,
      id: 'wallet-2',
      name: 'Tiền mặt',
      balance: 1000000,
    }

    const snapshots: WalletBalanceSnapshot[] = [
      {
        id: 'snap-w1',
        wallet_id: 'wallet-1',
        user_id: 'user-1',
        balance: 5000000,
        as_of_date: '2026-08-01',
        created_at: '2026-08-01T10:00:00Z',
      },
    ]

    const total = calculateTotalWalletBalance(
      [mockWallet, wallet2],
      snapshots,
      [],
      '2026-08-10'
    )
    // wallet-1 (5,000,000 from snapshot) + wallet-2 (1,000,000 fallback balance) = 6,000,000
    expect(total).toBe(6000000)
  })
})
