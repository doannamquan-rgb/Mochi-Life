import type { Wallet, WalletBalanceSnapshot, Transaction } from './types'

/**
 * Calculates the balance of a wallet as of a given date (default today).
 * Uses the latest balance snapshot on or before tDate as the reconciliation anchor,
 * and sums subsequent transactions up to tDate.
 *
 * Edge case handling:
 * - When a snapshot is created at date D, transactions BEFORE date D are considered
 *   reconciled and already accounted for in the snapshot balance.
 * - If no snapshot exists on or before tDate, it falls back to the wallet base balance.
 */
export function calculateWalletBalance(
  wallet: Wallet,
  snapshots: WalletBalanceSnapshot[] = [],
  transactions: Transaction[] = [],
  atDate?: string
): number {
  if (!wallet) return 0

  const targetDate = atDate || new Date().toISOString().split('T')[0]

  // Filter snapshots belonging to this wallet on or before targetDate
  const eligibleSnapshots = snapshots
    .filter(s => s.wallet_id === wallet.id && s.as_of_date <= targetDate)
    .sort((a, b) => {
      if (a.as_of_date !== b.as_of_date) {
        return b.as_of_date.localeCompare(a.as_of_date)
      }
      return (b.created_at || '').localeCompare(a.created_at || '')
    })

  if (eligibleSnapshots.length > 0) {
    const anchorSnapshot = eligibleSnapshots[0]
    let balance = Number(anchorSnapshot.balance)

    // Filter transactions occurring strictly after the snapshot date and up to targetDate
    const postSnapshotTxs = transactions.filter(
      t =>
        t.wallet_id === wallet.id &&
        t.transaction_date > anchorSnapshot.as_of_date &&
        t.transaction_date <= targetDate
    )

    for (const tx of postSnapshotTxs) {
      if (tx.type === 'income') {
        balance += Number(tx.amount)
      } else if (tx.type === 'expense') {
        balance -= Number(tx.amount)
      }
    }

    return balance
  }

  // If no snapshot exists on or before targetDate, fallback to wallet.balance
  return Number(wallet.balance) || 0
}

/**
 * Calculates the total balance across multiple wallets.
 */
export function calculateTotalWalletBalance(
  wallets: Wallet[] = [],
  snapshots: WalletBalanceSnapshot[] = [],
  transactions: Transaction[] = [],
  atDate?: string
): number {
  return wallets.reduce((total, wallet) => {
    return total + calculateWalletBalance(wallet, snapshots, transactions, atDate)
  }, 0)
}
