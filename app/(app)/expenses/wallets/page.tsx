'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { notifyDataChanged } from '@/lib/events'
import { toast } from 'sonner'
import { formatVND, calculateWalletBalance } from '@mochi/shared'
import { todayString, formatDate } from '@/lib/date-utils'
import type { Wallet, WalletBalanceSnapshot, Transaction } from '@/lib/types'

const WALLET_TYPES = [
  { id: 'cash', label: 'Tiền mặt', icon: '💵' },
  { id: 'bank', label: 'Tài khoản Ngân hàng', icon: '🏦' },
  { id: 'ewallet', label: 'Ví điện tử', icon: '📱' },
  { id: 'credit_card', label: 'Thẻ tín dụng', icon: '💳' },
  { id: 'other', label: 'Khác', icon: '🪙' },
] as const

function WalletForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useUser()
  const [name, setName] = useState('')
  const [type, setType] = useState<'cash' | 'bank' | 'ewallet' | 'credit_card' | 'other'>('bank')
  const [icon, setIcon] = useState('🏦')
  const [initialBalance, setInitialBalance] = useState('')
  const [color] = useState('#FF7A5C')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên ví')
      return
    }
    if (!user) return
    setLoading(true)

    const rawBal = parseInt(initialBalance.replace(/[,\.]/g, ''), 10) || 0
    const supabase = createClient()

    // 1. Insert wallet
    const { data: newWallet, error: wErr } = await supabase
      .from('wallets')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        icon: icon || '🪙',
        color,
        balance: rawBal,
      })
      .select()
      .single()

    if (wErr || !newWallet) {
      toast.error('Lỗi tạo ví: ' + (wErr?.message || 'Không thể lưu'))
      setLoading(false)
      return
    }

    // 2. Insert initial balance snapshot
    if (rawBal !== 0) {
      await supabase.from('wallet_balance_snapshots').insert({
        wallet_id: newWallet.id,
        user_id: user.id,
        balance: rawBal,
        as_of_date: todayString(),
      })
    }

    toast.success('Đã thêm ví tiền mới thành công! 🎉')
    notifyDataChanged('expenses', 'wallet')
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💳 Thêm ví tiền mới</h3>
          <button type="button" onClick={onClose} className="modal-close-btn">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="mochi-label">Tên ví *</label>
            <input
              type="text"
              className="mochi-input"
              placeholder="ví dụ: Vietcombank, Momo, Tiền mặt..."
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="mochi-label">Loại ví</label>
            <select
              className="mochi-input"
              value={type}
              onChange={e => {
                const newType = e.target.value as any
                setType(newType)
                const matched = WALLET_TYPES.find(w => w.id === newType)
                if (matched) setIcon(matched.icon)
              }}
            >
              {WALLET_TYPES.map(wt => (
                <option key={wt.id} value={wt.id}>{wt.icon} {wt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="mochi-label">Số dư khởi tạo (VNĐ)</label>
            <input
              type="number"
              className="mochi-input"
              placeholder="0"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo ví mới'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .modal-card { background: white; border-radius: 20px; width: 100%; max-width: 440px; padding: 24px; box-shadow: var(--shadow-lg); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .modal-header h3 { font-size: 1.15rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close-btn { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--chocolate-400); }
        .modal-body { display: flex; flex-direction: column; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
      `}</style>
    </div>
  )
}

function AdjustBalanceForm({
  wallet,
  currentComputedBalance,
  onClose,
  onSaved,
}: {
  wallet: Wallet
  currentComputedBalance: number
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useUser()
  const [asOfDate, setAsOfDate] = useState(todayString())
  const [newBalance, setNewBalance] = useState(currentComputedBalance.toString())
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const bal = parseInt(newBalance.replace(/[,\.]/g, ''), 10)
    if (isNaN(bal)) {
      toast.error('Vui lòng nhập số dư hợp lệ')
      return
    }
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    // 1. Create a new balance snapshot (historical audit trail)
    const { error: snapErr } = await supabase.from('wallet_balance_snapshots').insert({
      wallet_id: wallet.id,
      user_id: user.id,
      balance: bal,
      as_of_date: asOfDate,
    })

    if (snapErr) {
      toast.error('Lỗi khi chốt số dư: ' + snapErr.message)
      setLoading(false)
      return
    }

    // 2. Also update wallets.balance for backwards compatibility
    await supabase.from('wallets').update({ balance: bal }).eq('id', wallet.id)

    toast.success(`Đã cập nhật mốc số dư cho ${wallet.name}! 🎉`)
    notifyDataChanged('expenses', 'wallet')
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Chốt / Sửa số dư ví</h3>
          <button type="button" onClick={onClose} className="modal-close-btn">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <p className="modal-desc">
            Thiết lập số dư thực tế của <strong>{wallet.icon} {wallet.name}</strong> tại một mốc thời gian. Các giao dịch sau thời điểm này sẽ được tự động cộng/trừ vào số dư này.
          </p>

          <div className="form-group">
            <label className="mochi-label">Mốc thời gian đúng số dư *</label>
            <input
              type="date"
              className="mochi-input"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="mochi-label">Số dư thực tế tại mốc này (VNĐ) *</label>
            <input
              type="number"
              className="mochi-input"
              value={newBalance}
              onChange={e => setNewBalance(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Xác nhận chốt số dư'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .modal-card { background: white; border-radius: 20px; width: 100%; max-width: 460px; padding: 24px; box-shadow: var(--shadow-lg); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .modal-header h3 { font-size: 1.15rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close-btn { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--chocolate-400); }
        .modal-desc { font-size: 0.85rem; color: var(--chocolate-400); margin-bottom: 12px; line-height: 1.5; }
        .modal-body { display: flex; flex-direction: column; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
      `}</style>
    </div>
  )
}

function WalletsPageContent() {
  const { user } = useUser()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [snapshots, setSnapshots] = useState<WalletBalanceSnapshot[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adjustingWallet, setAdjustingWallet] = useState<{ wallet: Wallet; balance: number } | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const [wRes, snapRes, txRes] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('wallet_balance_snapshots').select('*').eq('user_id', user.id).order('as_of_date', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
    ])

    setWallets(wRes.data ?? [])
    setSnapshots(snapRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDataChanged('expenses', loadData)

  const today = todayString()
  const totalBalance = wallets.reduce(
    (sum, w) => sum + calculateWalletBalance(w, snapshots, transactions, today),
    0
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link href="/expenses" className="back-link">← Quản lý Chi tiêu</Link>
          </div>
          <h1 className="page-title">💳 Quản lý Ví tiền</h1>
          <p className="page-subtitle">Tổng số dư: {formatVND(totalBalance)}</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowAddModal(true)} className="mochi-btn mochi-btn-primary mochi-btn-sm">
            + Thêm ví mới
          </button>
        </div>
      </div>

      {showAddModal && (
        <WalletForm onClose={() => setShowAddModal(false)} onSaved={loadData} />
      )}

      {adjustingWallet && (
        <AdjustBalanceForm
          wallet={adjustingWallet.wallet}
          currentComputedBalance={adjustingWallet.balance}
          onClose={() => setAdjustingWallet(null)}
          onSaved={loadData}
        />
      )}

      {loading ? (
        <div className="wallets-grid">
          {[1, 2].map(i => (
            <div key={i} className="mochi-skeleton" style={{ height: 140, borderRadius: 20 }} />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">🪙</div>
          <h3>Chưa có ví tiền nào</h3>
          <p>Tạo ví tiền đầu tiên để bắt đầu theo dõi số dư chính xác nhé!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowAddModal(true)}>
            + Thêm ví ngay
          </button>
        </div>
      ) : (
        <div className="wallets-grid">
          {wallets.map(wallet => {
            const currentBal = calculateWalletBalance(wallet, snapshots, transactions, today)
            const walletSnaps = snapshots.filter(s => s.wallet_id === wallet.id)
            const latestSnap = walletSnaps[0]

            return (
              <div key={wallet.id} className="wallet-card">
                <div className="wallet-header">
                  <div className="wallet-icon-title">
                    <span className="wallet-icon">{wallet.icon || '🪙'}</span>
                    <div>
                      <h3 className="wallet-name">{wallet.name}</h3>
                      <span className="wallet-type">
                        {WALLET_TYPES.find(wt => wt.id === wallet.type)?.label || 'Ví'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mochi-btn mochi-btn-secondary mochi-btn-sm"
                    onClick={() => setAdjustingWallet({ wallet, balance: currentBal })}
                  >
                    ✏️ Sửa số dư
                  </button>
                </div>

                <div className="wallet-balance-row">
                  <div className="balance-label">Số dư hiện tại</div>
                  <div className="balance-value">{formatVND(currentBal)}</div>
                </div>

                {latestSnap && (
                  <div className="wallet-snapshot-info">
                    <span>📌 Mốc chốt gần nhất: {formatDate(latestSnap.as_of_date)} ({formatVND(Number(latestSnap.balance))})</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .page { max-width: 860px; margin: 0 auto; padding-bottom: 40px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .breadcrumb { margin-bottom: 4px; }
        .back-link { font-size: 0.82rem; font-weight: 700; color: var(--chocolate-400); text-decoration: none; transition: color 0.15s; }
        .back-link:hover { color: var(--peach-400); }
        .page-title { font-size: 1.45rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.95rem; color: var(--chocolate-500); font-weight: 700; margin: 0; }
        .header-actions { display: flex; gap: 8px; }
        .wallets-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .wallet-card { background: white; border-radius: 20px; padding: 20px; border: 1.5px solid var(--chocolate-100); box-shadow: var(--shadow-xs); display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
        .wallet-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .wallet-icon-title { display: flex; align-items: center; gap: 10px; }
        .wallet-icon { font-size: 1.8rem; line-height: 1; }
        .wallet-name { font-size: 1.05rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .wallet-type { font-size: 0.75rem; font-weight: 700; color: var(--chocolate-400); }
        .wallet-balance-row { border-top: 1px dashed var(--chocolate-100); padding-top: 12px; }
        .balance-label { font-size: 0.75rem; font-weight: 700; color: var(--chocolate-400); margin-bottom: 2px; }
        .balance-value { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); }
        .wallet-snapshot-info { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; background: var(--chocolate-50); padding: 6px 10px; border-radius: 8px; }
        @media (max-width: 640px) {
          .wallets-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

export default function WalletsPage() {
  return (
    <Suspense>
      <WalletsPageContent />
    </Suspense>
  )
}
