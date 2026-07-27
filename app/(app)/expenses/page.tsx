'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatVND, formatVNDCompact, formatDate } from '@/lib/format'
import { todayString, formatDate as fmtDate } from '@/lib/date-utils'
import type { Transaction, ExpenseCategory, Wallet } from '@/lib/types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { vi } from 'date-fns/locale'

const COLORS = ['#FF7A5C', '#FFCA1A', '#3BB88E', '#8F71F5', '#FF9A80', '#5ECFAA', '#A990FF', '#FFD84D', '#B8997A']

function TransactionForm({ onClose, onSaved, categories, wallets, existing }: {
  onClose: () => void
  onSaved: () => void
  categories: ExpenseCategory[]
  wallets: Wallet[]
  existing?: Transaction
}) {
  const { user } = useUser()
  const [type, setType] = useState<'expense' | 'income'>(existing?.type ?? 'expense')
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '')
  const [date, setDate] = useState(existing?.transaction_date ?? todayString())
  const [catId, setCatId] = useState(existing?.category_id ?? '')
  const [walletId, setWalletId] = useState(existing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)

  const filteredCats = categories.filter(c => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount.replace(/[,\.]/g, ''))
    if (!amt || amt <= 0) { toast.error('Vui lòng nhập số tiền hợp lệ'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      type,
      amount: amt,
      transaction_date: date,
      category_id: catId || null,
      wallet_id: walletId || null,
      description: description || null,
      note: note || null,
    }
    const { error } = existing
      ? await supabase.from('transactions').update(payload).eq('id', existing.id)
      : await supabase.from('transactions').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật!' : `${type === 'expense' ? 'Chi tiêu' : 'Thu nhập'} đã được lưu! 🎉`)
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa giao dịch' : 'Thêm giao dịch'} 💰</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Type toggle */}
          <div className="type-toggle">
            <button type="button" className={`type-btn ${type === 'expense' ? 'active-expense' : ''}`} onClick={() => { setType('expense'); setCatId('') }}>💸 Chi tiêu</button>
            <button type="button" className={`type-btn ${type === 'income' ? 'active-income' : ''}`} onClick={() => { setType('income'); setCatId('') }}>💚 Thu nhập</button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Số tiền (VND) *</label>
              <input type="number" className="mochi-input" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} min="1" required />
            </div>
            <div className="form-group">
              <label className="mochi-label">Ngày *</label>
              <input type="date" className="mochi-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Danh mục</label>
              <select className="mochi-input" value={catId} onChange={e => setCatId(e.target.value)}>
                <option value="">-- Chọn danh mục --</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="mochi-label">Ví</label>
              <select className="mochi-input" value={walletId} onChange={e => setWalletId(e.target.value)}>
                <option value="">-- Chọn ví --</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="mochi-label">Nội dung</label>
            <input type="text" className="mochi-input" placeholder="Mô tả giao dịch..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="mochi-label">Ghi chú</label>
            <textarea className="mochi-input" placeholder="Thêm ghi chú..." value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>

          <div className="modal-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu lại'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpensePageContent() {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add')
  const [editingTx, setEditingTx] = useState<Transaction | undefined>()
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')

  useEffect(() => { if (user) loadData() }, [user, period])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    let from = now.toISOString().split('T')[0]
    if (period === 'today') from = now.toISOString().split('T')[0]
    else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); from = d.toISOString().split('T')[0] }
    else if (period === 'month') from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    else from = `${now.getFullYear()}-01-01`

    const [txRes, catRes, walRes] = await Promise.all([
      supabase.from('transactions').select('*, category:expense_categories(id,name,icon,color,type), wallet:wallets(id,name,icon)').eq('user_id', user.id).gte('transaction_date', from).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('expense_categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('wallets').select('*').eq('user_id', user.id),
    ])
    setTransactions(txRes.data ?? [])
    setCategories(catRes.data ?? [])
    setWallets(walRes.data ?? [])
    setLoading(false)
  }

  async function deleteTx(id: string) {
    if (!confirm('Xóa giao dịch này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('Lỗi khi xóa'); return }
    toast.success('Đã xóa giao dịch')
    loadData()
  }

  function exportCSV() {
    const header = 'Ngày,Loại,Danh mục,Số tiền,Nội dung,Ví,Ghi chú'
    const rows = filteredTx.map(t =>
      `${fmtDate(t.transaction_date)},${t.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'},"${(t.category as any)?.name ?? ''}",${t.amount},"${t.description ?? ''}","${(t.wallet as any)?.name ?? ''}","${t.note ?? ''}"` 
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'chi-tieu.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất CSV!')
  }

  const filteredTx = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCat && t.category_id !== filterCat) return false
    if (search && !(
      (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      ((t.category as any)?.name ?? '').toLowerCase().includes(search.toLowerCase())
    )) return false
    return true
  })

  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  // Category chart data
  const catMap: Record<string, { name: string; amount: number; icon: string }> = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = (t.category as any)
    const key = cat?.id ?? 'other'
    if (!catMap[key]) catMap[key] = { name: cat?.name ?? 'Khác', amount: 0, icon: cat?.icon ?? '⭐' }
    catMap[key].amount += t.amount
  })
  const catChartData = Object.values(catMap).sort((a, b) => b.amount - a.amount).slice(0, 8)

  const periodLabel = period === 'today' ? 'Hôm nay' : period === 'week' ? 'Tuần này' : period === 'month' ? 'Tháng này' : 'Năm nay'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Chi tiêu</h1>
          <p className="page-subtitle">{periodLabel} · {transactions.length} giao dịch</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 CSV</button>
          <button onClick={() => { setEditingTx(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-grid">
        <div className="summary-card expense">
          <div className="sc-label">💸 Tổng chi</div>
          <div className="sc-value">{formatVNDCompact(totalExpense)}</div>
        </div>
        <div className="summary-card income">
          <div className="sc-label">💚 Tổng thu</div>
          <div className="sc-value">{formatVNDCompact(totalIncome)}</div>
        </div>
        <div className="summary-card balance">
          <div className="sc-label">💳 Số dư</div>
          <div className={`sc-value ${balance >= 0 ? 'positive' : 'negative'}`}>{balance >= 0 ? '+' : ''}{formatVNDCompact(balance)}</div>
        </div>
      </div>

      {/* Period filter */}
      <div className="period-filter">
        {(['today', 'week', 'month', 'year'] as const).map(p => (
          <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Hôm nay' : p === 'week' ? 'Tuần này' : p === 'month' ? 'Tháng này' : 'Năm nay'}
          </button>
        ))}
      </div>

      {/* Category chart */}
      {catChartData.length > 0 && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">Chi tiêu theo danh mục</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#B8997A' }} tickFormatter={v => formatVNDCompact(v)} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#5C4033' }} width={70} />
              <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: number) => [formatVND(v), 'Số tiền']} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                {catChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="filters-row">
        <input
          type="text"
          className="mochi-input search-input"
          placeholder="🔍 Tìm giao dịch..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="mochi-input filter-select" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
          <option value="all">Tất cả</option>
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <select className="mochi-input filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Transactions list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="mochi-skeleton" style={{ height: 72, borderRadius: 16 }} />)}
        </div>
      ) : filteredTx.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">😿</div>
          <h3>Chưa có giao dịch nào</h3>
          <p>Hãy ghi lại giao dịch đầu tiên!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm ngay</button>
        </div>
      ) : (
        <div className="tx-list">
          {filteredTx.map(tx => {
            const cat = tx.category as any
            const wallet = tx.wallet as any
            return (
              <div key={tx.id} className="tx-item">
                <div className="tx-cat-icon" style={{ background: `${cat?.color ?? '#B8997A'}20` }}>
                  {cat?.icon ?? (tx.type === 'expense' ? '💸' : '💚')}
                </div>
                <div className="tx-info">
                  <div className="tx-name">{tx.description || cat?.name || (tx.type === 'expense' ? 'Chi tiêu' : 'Thu nhập')}</div>
                  <div className="tx-meta">
                    {fmtDate(tx.transaction_date)}
                    {cat?.name && ` · ${cat.name}`}
                    {wallet?.name && ` · ${wallet.icon ?? ''} ${wallet.name}`}
                  </div>
                </div>
                <div className={`tx-amount ${tx.type === 'expense' ? 'expense' : 'income'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatVNDCompact(tx.amount)}
                </div>
                <div className="tx-actions">
                  <button className="icon-btn" onClick={() => { setEditingTx(tx); setShowForm(true) }}>✏️</button>
                  <button className="icon-btn" onClick={() => deleteTx(tx.id)}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <TransactionForm
          onClose={() => { setShowForm(false); setEditingTx(undefined) }}
          onSaved={loadData}
          categories={categories}
          wallets={wallets}
          existing={editingTx}
        />
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .summary-card { background: white; border-radius: 20px; padding: 16px 20px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); }
        .summary-card.expense { border-top: 3px solid var(--peach-400); }
        .summary-card.income { border-top: 3px solid var(--mint-400); }
        .summary-card.balance { border-top: 3px solid var(--lavender-400); }
        .sc-label { font-size: 0.78rem; font-weight: 700; color: var(--chocolate-400); margin-bottom: 6px; }
        .sc-value { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); }
        .sc-value.positive { color: var(--mint-400); }
        .sc-value.negative { color: var(--peach-400); }
        .period-filter { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .period-btn { padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .period-btn.active { background: var(--mint-400); border-color: var(--mint-400); color: white; }
        .card-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .filters-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 160px; }
        .filter-select { min-width: 140px; }
        .tx-list { display: flex; flex-direction: column; gap: 8px; }
        .tx-item { background: white; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); transition: all 0.15s; }
        .tx-item:hover { box-shadow: var(--shadow-sm); }
        .tx-cat-icon { width: 40px; height: 40px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .tx-info { flex: 1; min-width: 0; }
        .tx-name { font-weight: 700; font-size: 0.9rem; color: var(--chocolate-600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tx-meta { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; margin-top: 2px; }
        .tx-amount { font-weight: 800; font-size: 0.95rem; white-space: nowrap; }
        .tx-amount.expense { color: var(--peach-400); }
        .tx-amount.income { color: var(--mint-400); }
        .tx-actions { display: flex; gap: 4px; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px 6px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 500px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .type-toggle { display: flex; gap: 8px; }
        .type-btn { flex: 1; padding: 10px; border-radius: 12px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .type-btn.active-expense { background: var(--peach-100); border-color: var(--peach-400); color: var(--peach-500); }
        .type-btn.active-income { background: var(--mint-100); border-color: var(--mint-400); color: var(--mint-500); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        @media (max-width: 640px) {
          .summary-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
          .filters-row { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

export default function ExpensesPage() {
  return <Suspense><ExpensePageContent /></Suspense>
}
