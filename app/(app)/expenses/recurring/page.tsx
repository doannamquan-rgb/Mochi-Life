'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { formatVND, formatTransactionAmount, FREQUENCY_LABELS } from '@/lib/format'
import { syncRecurringTransactions, calculateNextDueDate } from '@/lib/recurring-sync'
import type { RecurringTransaction, ExpenseCategory, Wallet } from '@/lib/types'
import { toast } from 'sonner'

export default function RecurringTransactionsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null)
  const [form, setForm] = useState({
    type: 'expense' as 'expense' | 'income',
    amount: '',
    description: '',
    category_id: '',
    wallet_id: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_due_date: new Date().toISOString().split('T')[0],
    note: '',
  })

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    const [recRes, catRes, walRes] = await Promise.all([
      supabase.from('recurring_transactions').select('*, category:expense_categories(*), wallet:wallets(*)').eq('user_id', user.id).order('next_due_date'),
      supabase.from('expense_categories').select('*').eq('user_id', user.id),
      supabase.from('wallets').select('*').eq('user_id', user.id),
    ])

    setRecurringList(recRes.data ?? [])
    setCategories(catRes.data ?? [])
    setWallets(walRes.data ?? [])
    setLoading(false)
  }

  async function handleRunSync() {
    if (!user) return
    setSyncing(true)
    const created = await syncRecurringTransactions(user.id)
    if (created > 0) {
      toast.success(`Đã tự động ghi nhận ${created} giao dịch định kỳ!`)
    } else {
      toast.info('Không có giao dịch định kỳ nào đến hạn.')
    }
    await loadData()
    setSyncing(false)
  }

  async function handleTogglePause(item: RecurringTransaction) {
    if (!user) return
    const supabase = createClient()
    const updatedStatus = !item.is_active
    const { error } = await supabase.from('recurring_transactions').update({ is_active: updatedStatus }).eq('id', item.id)

    if (error) {
      toast.error('Có lỗi xảy ra: ' + error.message)
    } else {
      toast.success(updatedStatus ? 'Đã tiếp tục giao dịch định kỳ!' : 'Đã tạm dừng giao dịch định kỳ!')
      loadData()
    }
  }

  async function handleRunNow(item: RecurringTransaction) {
    if (!user) return
    const supabase = createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: item.type,
      amount: Math.abs(item.amount),
      transaction_date: todayStr,
      category_id: item.category_id,
      wallet_id: item.wallet_id,
      description: item.description,
      note: 'Giao dịch thực hiện thủ công',
      recurring_id: item.id,
      occurrence_date: todayStr,
    })

    if (error) {
      toast.error('Lỗi khi tạo giao dịch: ' + error.message)
    } else {
      const nextDate = calculateNextDueDate(new Date(item.next_due_date), item.frequency)
      await supabase.from('recurring_transactions').update({ next_due_date: nextDate.toISOString().split('T')[0] }).eq('id', item.id)

      toast.success('Đã chạy ngay giao dịch thành công!')
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa giao dịch định kỳ này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
    if (error) {
      toast.error('Lỗi khi xóa: ' + error.message)
    } else {
      toast.success('Đã xóa giao dịch định kỳ!')
      loadData()
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const amt = Math.abs(Number(form.amount))
    if (!amt || isNaN(amt) || amt <= 0) { toast.error('Vui lòng nhập số tiền hợp lệ (số dương)'); return }
    if (!form.description.trim()) { toast.error('Vui lòng nhập mô tả'); return }

    const supabase = createClient()
    setLoading(true)

    const payload = {
      user_id: user.id,
      type: form.type,
      amount: amt,
      description: form.description.trim(),
      category_id: form.category_id || null,
      wallet_id: form.wallet_id || null,
      frequency: form.frequency,
      next_due_date: form.next_due_date,
      note: form.note || null,
    }

    if (editingItem) {
      const { error } = await supabase.from('recurring_transactions').update(payload).eq('id', editingItem.id)
      if (error) toast.error('Lỗi: ' + error.message)
      else toast.success('Đã cập nhật giao dịch định kỳ!')
    } else {
      const { error } = await supabase.from('recurring_transactions').insert(payload)
      if (error) toast.error('Lỗi: ' + error.message)
      else toast.success('Đã thêm giao dịch định kỳ mới!')
    }

    setShowModal(false)
    setLoading(false)
    loadData()
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/expenses" className="back-link">← Tài chính</Link>
            <h1 className="page-title">🔁 Giao dịch định kỳ</h1>
          </div>
          <p className="page-subtitle">Tự động hóa các khoản thu nhập & chi tiêu lặp lại</p>
        </div>
        <div className="header-actions">
          <button className="mochi-btn mochi-btn-secondary mochi-btn-sm" onClick={handleRunSync} disabled={syncing}>
            {syncing ? 'Đang kiểm tra...' : '⚡ Chạy ngay'}
          </button>
          <button
            className="mochi-btn mochi-btn-primary mochi-btn-sm"
            onClick={() => {
              setEditingItem(null)
              setForm({
                type: 'expense',
                amount: '',
                description: '',
                category_id: categories[0]?.id || '',
                wallet_id: wallets[0]?.id || '',
                frequency: 'monthly',
                next_due_date: todayStr,
                note: '',
              })
              setShowModal(true)
            }}
          >
            + Thêm giao dịch định kỳ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mochi-skeleton" style={{ height: 200, borderRadius: 24 }} />
      ) : recurringList.length === 0 ? (
        <div className="mochi-card mochi-empty-state">
          <div className="mascot">🔁</div>
          <h2>Chưa có giao dịch định kỳ nào</h2>
          <p>Tạo các khoản chi tiêu/thu nhập định kỳ như tiền nhà, hóa đơn điện nước hay tiền lương để Mochi tự động ghi chép nhé!</p>
          <button
            className="mochi-btn mochi-btn-primary"
            onClick={() => setShowModal(true)}
          >
            + Thêm giao dịch định kỳ
          </button>
        </div>
      ) : (
        <div className="recurring-grid">
          {recurringList.map(item => {
            const isOverdue = item.is_active && item.next_due_date < todayStr
            const isDueToday = item.is_active && item.next_due_date === todayStr
            const statusLabel = !item.is_active
              ? 'Đã tạm dừng'
              : isOverdue
                ? 'Quá hạn'
                : isDueToday
                  ? 'Sắp đến hạn'
                  : 'Đang hoạt động'

            const statusClass = !item.is_active
              ? 'status-paused'
              : isOverdue
                ? 'status-overdue'
                : isDueToday
                  ? 'status-due'
                  : 'status-active'

            return (
              <div key={item.id} className={`recurring-card ${statusClass}`}>
                <div className="rc-header">
                  <div className="rc-cat">
                    <span className="rc-icon">{item.category?.icon || (item.type === 'expense' ? '💸' : '💰')}</span>
                    <div>
                      <div className="rc-title">{item.description}</div>
                      <div className="rc-sub">{item.category?.name || 'Chưa phân loại'} · {item.wallet?.name || 'Ví'}</div>
                    </div>
                  </div>
                  <span className={`rc-status-badge ${statusClass}`}>{statusLabel}</span>
                </div>

                <div className="rc-amount" style={{ color: item.type === 'expense' ? 'var(--peach-500)' : 'var(--mint-500)' }}>
                  {formatTransactionAmount(item.amount, item.type)}
                </div>

                <div className="rc-details">
                  <div>Tần suất: <strong>{FREQUENCY_LABELS[item.frequency] || item.frequency}</strong></div>
                  <div>Ngày chạy tiếp theo: <strong>{new Date(item.next_due_date).toLocaleDateString('vi-VN')}</strong></div>
                </div>

                <div className="rc-actions">
                  <button className="mochi-btn mochi-btn-secondary mochi-btn-sm" onClick={() => handleRunNow(item)}>
                    ⚡ Chạy ngay
                  </button>
                  <button className="mochi-btn mochi-btn-ghost mochi-btn-sm" onClick={() => handleTogglePause(item)}>
                    {item.is_active ? '⏸️ Tạm dừng' : '▶️ Tiếp tục'}
                  </button>
                  <button
                    className="mochi-btn mochi-btn-ghost mochi-btn-sm"
                    onClick={() => {
                      setEditingItem(item)
                      setForm({
                        type: item.type,
                        amount: item.amount.toString(),
                        description: item.description,
                        category_id: item.category_id || '',
                        wallet_id: item.wallet_id || '',
                        frequency: item.frequency,
                        next_due_date: item.next_due_date,
                        note: item.note || '',
                      })
                      setShowModal(true)
                    }}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                  <button className="mochi-btn mochi-btn-danger mochi-btn-sm" onClick={() => handleDelete(item.id)}>
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-bounce-in" onClick={e => e.stopPropagation()}>
            <h2>{editingItem ? 'Chỉnh sửa giao dịch định kỳ' : 'Thêm giao dịch định kỳ'}</h2>
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="form-group">
                <label className="mochi-label">Loại giao dịch</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className={`mochi-btn ${form.type === 'expense' ? 'mochi-btn-danger' : 'mochi-btn-secondary'}`}
                    onClick={() => setForm({ ...form, type: 'expense' })}
                  >
                    💸 Chi tiêu
                  </button>
                  <button
                    type="button"
                    className={`mochi-btn ${form.type === 'income' ? 'mochi-btn-primary' : 'mochi-btn-secondary'}`}
                    onClick={() => setForm({ ...form, type: 'income' })}
                  >
                    💰 Thu nhập
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="mochi-label">Mô tả *</label>
                <input
                  type="text"
                  className="mochi-input"
                  placeholder="Ví dụ: Tiền nhà hằng tháng"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="mochi-label">Số tiền (VND) *</label>
                <input
                  type="number"
                  className="mochi-input"
                  placeholder="3000000"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="mochi-label">Danh mục</label>
                  <select
                    className="mochi-input"
                    value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">Chưa chọn</option>
                    {categories.filter(c => c.type === form.type).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="mochi-label">Ví thanh toán</label>
                  <select
                    className="mochi-input"
                    value={form.wallet_id}
                    onChange={e => setForm({ ...form, wallet_id: e.target.value })}
                  >
                    <option value="">Chưa chọn</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="mochi-label">Tần suất</label>
                  <select
                    className="mochi-input"
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value as any })}
                  >
                    <option value="daily">Hằng ngày</option>
                    <option value="weekly">Hằng tuần</option>
                    <option value="monthly">Hằng tháng</option>
                    <option value="yearly">Hằng năm</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="mochi-label">Ngày chạy tiếp theo</label>
                  <input
                    type="date"
                    className="mochi-input"
                    value={form.next_due_date}
                    onChange={e => setForm({ ...form, next_due_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="mochi-btn mochi-btn-secondary" onClick={() => setShowModal(false)}>
                  Bỏ qua
                </button>
                <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
                  {loading ? 'Đang lưu...' : 'Lưu giao dịch định kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .back-link { text-decoration: none; font-size: 0.85rem; font-weight: 700; color: var(--chocolate-400); }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 4px 0 0; }
        .header-actions { display: flex; gap: 8px; }
        .recurring-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .recurring-card { background: white; border-radius: 20px; padding: 20px; border: 1.5px solid var(--chocolate-100); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; }
        .recurring-card.status-paused { opacity: 0.7; background: var(--cream); }
        .recurring-card.status-overdue { border-color: var(--peach-300); }
        .recurring-card.status-due { border-color: var(--cheese-300); }
        .rc-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .rc-cat { display: flex; items-center: center; gap: 10px; }
        .rc-icon { font-size: 1.8rem; }
        .rc-title { font-weight: 800; font-size: 0.95rem; color: var(--chocolate-600); }
        .rc-sub { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; }
        .rc-status-badge { font-size: 0.68rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; }
        .rc-status-badge.status-active { background: var(--mint-100); color: var(--mint-500); }
        .rc-status-badge.status-paused { background: var(--chocolate-100); color: var(--chocolate-400); }
        .rc-status-badge.status-due { background: var(--cheese-100); color: var(--cheese-500); }
        .rc-status-badge.status-overdue { background: var(--peach-100); color: var(--peach-500); }
        .rc-amount { font-size: 1.3rem; font-weight: 800; }
        .rc-details { font-size: 0.78rem; color: var(--chocolate-500); display: flex; flex-direction: column; gap: 2px; background: var(--cream); padding: 8px 12px; border-radius: 12px; }
        .rc-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-content { background: white; border-radius: 24px; padding: 24px; max-width: 500px; width: 100%; box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  )
}
