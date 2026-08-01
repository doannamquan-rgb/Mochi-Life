'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatVND, formatTransactionAmount, formatSignedVND } from '@/lib/format'
import { todayString, formatDate, CalendarPeriod } from '@/lib/date-utils'
import { syncRecurringTransactions } from '@/lib/recurring-sync'
import type { Transaction, ExpenseCategory, Wallet } from '@/lib/types'
import { fetchAllRows } from '@/lib/supabase/fetchAllRows'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'


function TransactionForm({ onClose, onSaved, categories, wallets, existing }: {
  onClose: () => void
  onSaved: () => void
  categories: ExpenseCategory[]
  wallets: Wallet[]
  existing?: Transaction
}) {
  const { user } = useUser()
  const [type, setType] = useState<'expense' | 'income'>(existing?.type ?? 'expense')
  const [amount, setAmount] = useState(existing?.amount ? Math.abs(existing.amount).toString() : '')
  const [date, setDate] = useState(existing?.transaction_date ?? todayString())
  const [catId, setCatId] = useState(existing?.category_id ?? '')
  const [walletId, setWalletId] = useState(existing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)

  // Filter categories by type if category has type defined, preserving untyped categories
  const filteredCats = categories.filter(c => !c.type || c.type === type)

  function handleTypeSwitch(newType: 'expense' | 'income') {
    setType(newType)
    if (catId) {
      const selectedCat = categories.find(c => c.id === catId)
      if (selectedCat && selectedCat.type && selectedCat.type !== newType) {
        setCatId('')
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Math.abs(Number(amount.replace(/[,\.]/g, '')))
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ (số dương)')
      return
    }
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

    if (error) {
      toast.error('Lỗi lưu giao dịch: ' + error.message)
      setLoading(false)
      return
    }

    toast.success(existing ? 'Đã cập nhật giao dịch thành công!' : `Đã lưu ${type === 'expense' ? 'khoản chi' : 'khoản thu'} thành công! 🎉`)
    onSaved()
    onClose()
  }

  return (
    <div className="inline-form-inner">
      <div className="inline-form-header">
        <h2>{existing ? (type === 'expense' ? 'Sửa khoản chi 💸' : 'Sửa khoản thu 💚') : (type === 'expense' ? 'Thêm khoản chi 💸' : 'Thêm khoản thu 💚')}</h2>
        <button type="button" onClick={onClose} className="inline-close-btn" aria-label="Đóng form">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="inline-form-body">
        {/* Type Selection Cards */}
        <fieldset className="type-fieldset">
          <legend className="type-legend">Loại giao dịch *</legend>
          <div className="type-cards-grid" role="radiogroup" aria-label="Loại giao dịch">
            <label className={`type-card ${type === 'expense' ? 'selected-expense' : ''}`}>
              <input
                type="radio"
                name="transaction-type"
                value="expense"
                checked={type === 'expense'}
                onChange={() => handleTypeSwitch('expense')}
                className="sr-only"
              />
              <span className="tc-icon">💸</span>
              <div className="tc-info">
                <span className="tc-title">Chi tiêu</span>
                <span className="tc-desc">Tiền đi ra</span>
              </div>
              <span className="tc-check">{type === 'expense' ? '✓' : ''}</span>
            </label>

            <label className={`type-card ${type === 'income' ? 'selected-income' : ''}`}>
              <input
                type="radio"
                name="transaction-type"
                value="income"
                checked={type === 'income'}
                onChange={() => handleTypeSwitch('income')}
                className="sr-only"
              />
              <span className="tc-icon">💚</span>
              <div className="tc-info">
                <span className="tc-title">Thu nhập</span>
                <span className="tc-desc">Tiền đi vào</span>
              </div>
              <span className="tc-check">{type === 'income' ? '✓' : ''}</span>
            </label>
          </div>
          <p className="type-confirm-text">
            {existing
              ? (type === 'expense' ? 'Bạn đang chỉnh sửa một khoản chi.' : 'Bạn đang chỉnh sửa một khoản thu.')
              : (type === 'expense' ? 'Bạn đang thêm một khoản chi.' : 'Bạn đang thêm một khoản thu.')}
          </p>
        </fieldset>

        <div className="form-row">
          <div className="form-group">
            <label className="mochi-label">Số tiền (VND) *</label>
            <input
              id="amount-input"
              type="number"
              className="mochi-input"
              placeholder="50000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              required
            />
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

        <div className="inline-form-footer">
          <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose}>Hủy</button>
          <button
            type="submit"
            className={`mochi-btn ${type === 'expense' ? 'mochi-btn-danger' : 'mochi-btn-primary'}`}
            disabled={loading}
          >
            {loading
              ? 'Đang lưu...'
              : existing
                ? (type === 'expense' ? 'Cập nhật khoản chi' : 'Cập nhật khoản thu')
                : (type === 'expense' ? 'Lưu khoản chi' : 'Lưu khoản thu')}
          </button>
        </div>
      </form>
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
  const [selectedPeriod, setSelectedPeriod] = useState<CalendarPeriod>('month')
  const [appliedPeriod, setAppliedPeriod] = useState<CalendarPeriod>('month')
  const hasScrolledRef = useRef(false)
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user, selectedPeriod])

  // Single-scroll into view when form opens & focus first input
  useEffect(() => {
    if (showForm && !hasScrolledRef.current) {
      hasScrolledRef.current = true
      requestAnimationFrame(() => {
        const el = document.getElementById('transaction-form-card')
        if (el) {
          el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
          const firstInput = el.querySelector('#amount-input') as HTMLInputElement | null
          if (firstInput) {
            firstInput.focus({ preventScroll: true })
          }
        }
      })
    }
  }, [showForm])

  function handleCloseForm() {
    setShowForm(false)
    setEditingTx(undefined)
    hasScrolledRef.current = false
  }

  async function loadData() {
    if (!user) return
    const requestId = ++requestIdRef.current
    setLoading(true)

    // Sync recurring transactions
    await syncRecurringTransactions(user.id)

    const supabase = createClient()
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    let from: string | null = todayStr
    let to: string | null = todayStr

    if (selectedPeriod === 'today') {
      from = todayStr
      to = todayStr
    } else if (selectedPeriod === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      to = todayStr
    } else if (selectedPeriod === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else if (selectedPeriod === 'year') {
      from = `${now.getFullYear()}-01-01`
      to = `${now.getFullYear()}-12-31`
    } else {
      // 'all'
      from = null
      to = null
    }

    const [txRes, catRes, walRes] = await Promise.all([
      fetchAllRows<Transaction>((rangeFrom, rangeTo) => {
        let q = supabase.from('transactions')
          .select('*, category:expense_categories(id,name,icon,color,type), wallet:wallets(id,name,icon)', { count: 'exact' })
          .eq('user_id', user.id)
        if (from && to) {
          q = q.gte('transaction_date', from).lte('transaction_date', to)
        }
        q = q.order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
        return q.range(rangeFrom, rangeTo)
      }),
      supabase.from('expense_categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('wallets').select('*').eq('user_id', user.id),
    ])

    if (!mountedRef.current || requestId !== requestIdRef.current) return

    if (!txRes.ok) {
      toast.error('Không thể tải giao dịch: ' + txRes.error.message)
      setLoading(false)
      return
    }

    setTransactions(txRes.data)
    setCategories(catRes.data ?? [])
    setWallets(walRes.data ?? [])
    setAppliedPeriod(selectedPeriod)
    setLoading(false)
  }


  async function deleteTx(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('Lỗi khi xóa: ' + error.message); return }
    toast.success('Đã xóa giao dịch thành công!')
    loadData()
  }

  function exportCSV() {
    const header = 'Ngày,Loại,Danh mục,Số tiền,Nội dung,Ví,Ghi chú'
    const rows = filteredTx.map(t =>
      `${formatDate(t.transaction_date)},${t.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'},"${(t.category as any)?.name ?? ''}",${t.amount},"${t.description ?? ''}","${(t.wallet as any)?.name ?? ''}","${t.note ?? ''}"` 
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'chi-tieu.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất CSV thành công!')
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

  // Summary calculations over period-filtered transactions
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  // Category chart data: Combined Income and Expense grouped by category ID over period-filtered transactions
  const catMap: Record<string, { categoryKey: string; name: string; expense: number; income: number; icon: string }> = {}
  transactions.forEach(t => {
    const categoryKey = t.category_id ?? 'uncategorized'
    const category = categories.find(c => c.id === t.category_id) || (t.category as any)
    const categoryName = category?.name ?? 'Khác'
    const categoryIcon = category?.icon ?? '⭐'

    if (!catMap[categoryKey]) {
      catMap[categoryKey] = {
        categoryKey,
        name: `${categoryIcon} ${categoryName}`,
        expense: 0,
        income: 0,
        icon: categoryIcon,
      }
    }

    if (t.type === 'expense') {
      catMap[categoryKey].expense += t.amount
    } else {
      catMap[categoryKey].income += t.amount
    }
  })
  const catChartData = Object.values(catMap).sort((a, b) => (b.expense + b.income) - (a.expense + a.income))
  const chartHeight = Math.max(220, catChartData.length * 52)

  const periodLabel = appliedPeriod === 'today' ? 'Hôm nay'
    : appliedPeriod === 'week' ? 'Tuần này'
    : appliedPeriod === 'month' ? 'Tháng này'
    : appliedPeriod === 'year' ? 'Năm nay'
    : 'Tất cả'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Chi tiêu</h1>
          <p className="page-subtitle">{periodLabel} · {transactions.length} giao dịch</p>
        </div>
        <div className="header-actions">
          <Link href="/expenses/recurring" className="mochi-btn mochi-btn-secondary mochi-btn-sm">🔁 Định kỳ</Link>
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 CSV</button>
          <button onClick={() => { setEditingTx(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-grid">
        <div className="summary-card expense">
          <div className="sc-label">💸 Tổng chi</div>
          <div className="sc-value">{formatVND(totalExpense)}</div>
        </div>
        <div className="summary-card income">
          <div className="sc-label">💚 Tổng thu</div>
          <div className="sc-value">{formatVND(totalIncome)}</div>
        </div>
        <div className="summary-card balance">
          <div className="sc-label">💳 Số dư</div>
          <div className={`sc-value ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`}>
            {formatSignedVND(balance, { showPositiveSign: true })}
          </div>
        </div>
      </div>

      {/* Period filter */}
      <div className="period-filter">
        {(['today', 'week', 'month', 'year', 'all'] as const).map(p => (
          <button
            key={p}
            type="button"
            aria-pressed={selectedPeriod === p}
            className={`period-btn ${selectedPeriod === p ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(p)}
          >
            {p === 'today' ? 'Hôm nay'
              : p === 'week' ? 'Tuần này'
              : p === 'month' ? 'Tháng này'
              : p === 'year' ? 'Năm nay'
              : 'Tất cả'}
          </button>
        ))}
      </div>


      {/* Category chart */}
      <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 className="card-title">Thu chi theo danh mục</h3>
        {catChartData.length === 0 ? (
          <div className="chart-empty-state" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--chocolate-400)', fontWeight: 600, fontSize: '0.9rem' }}>
            Chưa có dữ liệu thu chi trong khoảng thời gian này.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={catChartData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chocolate-100)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--chocolate-400)' }} tickFormatter={v => formatVND(v)} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--chocolate-600)' }} width={110} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1.5px solid var(--chocolate-100)', borderRadius: 12, fontFamily: 'Nunito', color: 'var(--chocolate-600)' }}
                formatter={(v: any, name?: any) => [
                  String(name) === 'expense' ? `Chi tiêu: -${formatVND(Number(v))}` : `Thu nhập: +${formatVND(Number(v))}`,
                  String(name) === 'expense' ? '💸 Chi tiêu' : '💚 Thu nhập'
                ]}
              />
              <Legend
                formatter={(value) => value === 'expense' ? '💸 Chi tiêu' : '💚 Thu nhập'}
              />
              <Bar dataKey="expense" name="expense" fill="#FF7A5C" radius={[0, 6, 6, 0]} barSize={14} />
              <Bar dataKey="income" name="income" fill="#3BB88E" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

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

      {/* Inline Form */}
      {showForm && (
        <div id="transaction-form-card" className="inline-form-card animate-slide-up" style={{ scrollMarginTop: 80 }}>
          <TransactionForm
            onClose={handleCloseForm}
            onSaved={loadData}
            categories={categories}
            wallets={wallets}
            existing={editingTx}
          />
        </div>
      )}

      {/* Transaction History Section (Hidden strictly while form is open) */}
      {!showForm && (
        <section className="transaction-history">
          <div className="history-header">
            <h2>Lịch sử giao dịch</h2>
            <span className="history-count">{filteredTx.length} giao dịch</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="mochi-skeleton" style={{ height: 72, borderRadius: 16 }} />)}
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
                        {formatDate(tx.transaction_date)}
                        {cat?.name && ` · ${cat.name}`}
                        {wallet?.name && ` · ${wallet.icon ?? ''} ${wallet.name}`}
                      </div>
                    </div>
                    <div className={`tx-amount ${tx.type === 'expense' ? 'expense' : 'income'}`}>
                      {formatTransactionAmount(tx.amount, tx.type)}
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
        </section>
      )}

      <style jsx global>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: calc(var(--bottom-nav-height, 80px) + env(safe-area-inset-bottom, 0px) + 24px); }
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
        .inline-form-card { background: white; border-radius: 24px; padding: 24px; border: 2px solid var(--chocolate-100); box-shadow: var(--shadow-md); margin-bottom: 24px; }
        .inline-form-inner { display: flex; flex-direction: column; gap: 16px; }
        .inline-form-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .inline-form-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .inline-close-btn { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); transition: background 0.15s; }
        .inline-close-btn:hover { background: var(--chocolate-100); }
        .inline-form-body { display: flex; flex-direction: column; gap: 14px; }
        .type-fieldset { border: none; padding: 0; margin: 0 0 4px; }
        .type-legend { font-weight: 700; font-size: 0.9rem; color: var(--chocolate-500); margin-bottom: 8px; }
        .type-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
        .type-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; border: 2px solid var(--chocolate-100); background: white; cursor: pointer; transition: all 0.2s; position: relative; }
        .type-card:hover { border-color: var(--chocolate-200); box-shadow: var(--shadow-xs); }
        .type-card:focus-within { outline: none; box-shadow: 0 0 0 3px rgba(255,202,26,0.3); border-color: var(--cheese-400); }
        .type-card.selected-expense { border-color: var(--peach-400); background: var(--peach-50); color: var(--peach-500); }
        .type-card.selected-income { border-color: var(--mint-400); background: var(--mint-50); color: var(--mint-500); }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
        .tc-icon { font-size: 1.6rem; }
        .tc-info { display: flex; flex-direction: column; flex: 1; }
        .tc-title { font-weight: 800; font-size: 0.95rem; color: inherit; }
        .tc-desc { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; }
        .tc-check { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; border: 1.5px solid var(--chocolate-200); color: transparent; background: white; }
        .selected-expense .tc-check { border-color: var(--peach-400); background: var(--peach-400); color: white; }
        .selected-income .tc-check { border-color: var(--mint-400); background: var(--mint-400); color: white; }
        .type-confirm-text { font-size: 0.82rem; font-weight: 700; color: var(--chocolate-400); margin: 0 0 12px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .inline-form-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
        .transaction-history { display: flex; flex-direction: column; gap: 12px; }
        .history-header { display: flex; align-items: center; justify-content: space-between; }
        .history-header h2 { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .history-count { font-size: 0.82rem; font-weight: 700; color: var(--chocolate-400); }
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
        @media (max-width: 640px) {
          .summary-grid { grid-template-columns: 1fr; }
          .type-cards-grid { grid-template-columns: 1fr; gap: 12px; }
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
