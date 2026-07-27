'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatVND, formatVNDCompact, getPercent } from '@/lib/format'
import type { Budget, ExpenseCategory } from '@/lib/types'

export default function BudgetPage() {
  const { user } = useUser()
  const [budgets, setBudgets] = useState<(Budget & { spent: number })[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | undefined>()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`

    const [budgetsRes, catsRes, txRes] = await Promise.all([
      supabase.from('budgets').select('*, category:expense_categories(*)').eq('user_id', user.id).eq('month', month).eq('year', year),
      supabase.from('expense_categories').select('*').eq('user_id', user.id).eq('type', 'expense'),
      supabase.from('transactions').select('amount, category_id').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', monthStart),
    ])

    const txByCategory: Record<string, number> = {}
    const totalSpent = (txRes.data ?? []).reduce((s: number, t: any) => { txByCategory[t.category_id ?? 'null'] = (txByCategory[t.category_id ?? 'null'] ?? 0) + t.amount; return s + t.amount }, 0)

    const bs = (budgetsRes.data ?? []).map((b: any) => ({
      ...b,
      spent: b.is_total_budget ? totalSpent : (txByCategory[b.category_id ?? 'null'] ?? 0),
    }))
    setBudgets(bs)
    setCategories(catsRes.data ?? [])
    setLoading(false)
  }

  async function deleteBudget(id: string) {
    if (!confirm('Xóa ngân sách này?')) return
    const supabase = createClient()
    await supabase.from('budgets').delete().eq('id', id)
    toast.success('Đã xóa ngân sách')
    loadData()
  }

  const totalBudget = budgets.find(b => b.is_total_budget)
  const categoryBudgets = budgets.filter(b => !b.is_total_budget)

  function getBudgetStatus(pct: number): { color: string; label: string } {
    if (pct >= 100) return { color: '#FF7A5C', label: 'Đã vượt!' }
    if (pct >= 90) return { color: '#FF7A5C', label: 'Gần hết' }
    if (pct >= 80) return { color: '#E6B200', label: 'Cẩn thận' }
    if (pct >= 50) return { color: '#FFCA1A', label: 'Ổn' }
    return { color: '#3BB88E', label: 'Tốt' }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 Ngân sách tháng {month}/{year}</h1>
          <p className="page-subtitle">Kiểm soát chi tiêu của bạn</p>
        </div>
        <button onClick={() => { setEditBudget(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm ngân sách</button>
      </div>

      {/* Total budget */}
      {totalBudget && (
        <div className="total-budget-card">
          <div className="tb-header">
            <div>
              <div className="tb-label">💰 Ngân sách tổng tháng này</div>
              <div className="tb-amount">{formatVND(totalBudget.amount)}</div>
            </div>
            <div className="tb-pct" style={{ color: getBudgetStatus(getPercent(totalBudget.spent, totalBudget.amount)).color }}>
              {getPercent(totalBudget.spent, totalBudget.amount)}%
            </div>
          </div>
          <div className="mochi-progress" style={{ height: 12, marginTop: 12 }}>
            <div
              className="mochi-progress-bar"
              style={{
                width: `${Math.min(100, getPercent(totalBudget.spent, totalBudget.amount))}%`,
                background: `linear-gradient(90deg, ${getBudgetStatus(getPercent(totalBudget.spent, totalBudget.amount)).color}, ${getBudgetStatus(getPercent(totalBudget.spent, totalBudget.amount)).color}aa)`,
              }}
            />
          </div>
          <div className="tb-detail">
            <span>Đã chi: {formatVNDCompact(totalBudget.spent)}</span>
            <span>Còn lại: {formatVNDCompact(Math.max(0, totalBudget.amount - totalBudget.spent))}</span>
          </div>

          {getPercent(totalBudget.spent, totalBudget.amount) >= 80 && (
            <div className="budget-warning">
              🐱 Mochi nhắc nhẹ: Bạn đã dùng {getPercent(totalBudget.spent, totalBudget.amount)}% ngân sách tháng này rồi nha!
            </div>
          )}

          <div className="tb-actions">
            <button onClick={() => { setEditBudget(totalBudget); setShowForm(true) }} className="mochi-btn mochi-btn-secondary mochi-btn-sm">✏️ Sửa</button>
            <button onClick={() => deleteBudget(totalBudget.id)} className="mochi-btn mochi-btn-ghost mochi-btn-sm">🗑️ Xóa</button>
          </div>
        </div>
      )}

      {/* Category budgets */}
      <h2 className="section-title">Ngân sách theo danh mục</h2>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="mochi-skeleton" style={{ height: 100, borderRadius: 18 }} />)}
        </div>
      ) : categoryBudgets.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">💸</div>
          <h3>Chưa có ngân sách theo danh mục</h3>
          <p>Thêm ngân sách để kiểm soát từng danh mục chi tiêu</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm ngân sách</button>
        </div>
      ) : (
        <div className="budgets-grid">
          {categoryBudgets.map(b => {
            const pct = getPercent(b.spent, b.amount)
            const status = getBudgetStatus(pct)
            const cat = b.category as any
            return (
              <div key={b.id} className="budget-card" style={{ borderTop: `3px solid ${status.color}` }}>
                <div className="bc-header">
                  <div className="bc-cat">
                    <span className="bc-icon">{cat?.icon ?? '📋'}</span>
                    <span className="bc-name">{cat?.name ?? 'Danh mục'}</span>
                  </div>
                  <span className="bc-status" style={{ color: status.color }}>{status.label}</span>
                </div>
                <div className="bc-amounts">
                  <span className="bc-spent">{formatVNDCompact(b.spent)}</span>
                  <span className="bc-divider">/</span>
                  <span className="bc-total">{formatVNDCompact(b.amount)}</span>
                </div>
                <div className="mochi-progress" style={{ marginTop: 8 }}>
                  <div
                    className="mochi-progress-bar"
                    style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${status.color}, ${status.color}aa)` }}
                  />
                </div>
                <div className="bc-remaining">
                  {b.spent > b.amount
                    ? `⚠️ Đã vượt ${formatVNDCompact(b.spent - b.amount)}`
                    : `Còn ${formatVNDCompact(b.amount - b.spent)}`
                  }
                </div>
                <div className="bc-actions">
                  <button onClick={() => { setEditBudget(b); setShowForm(true) }} className="icon-btn">✏️</button>
                  <button onClick={() => deleteBudget(b.id)} className="icon-btn">🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <BudgetForm
          onClose={() => { setShowForm(false); setEditBudget(undefined) }}
          onSaved={loadData}
          categories={categories}
          existing={editBudget}
          month={month}
          year={year}
        />
      )}

      <style jsx>{`
        .page { max-width: 800px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .total-budget-card { background: white; border-radius: 24px; padding: 24px; box-shadow: var(--shadow-md); border: 1.5px solid var(--chocolate-100); }
        .tb-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .tb-label { font-size: 0.85rem; font-weight: 700; color: var(--chocolate-400); margin-bottom: 6px; }
        .tb-amount { font-size: 1.8rem; font-weight: 800; color: var(--chocolate-600); }
        .tb-pct { font-size: 2rem; font-weight: 800; }
        .tb-detail { display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.82rem; font-weight: 700; color: var(--chocolate-400); }
        .budget-warning { margin-top: 12px; padding: 10px 14px; background: var(--cheese-50); border: 1.5px solid var(--cheese-200); border-radius: 12px; font-size: 0.85rem; font-weight: 600; color: var(--chocolate-600); }
        .tb-actions { display: flex; gap: 8px; margin-top: 12px; }
        .section-title { font-size: 1rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .budgets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .budget-card { background: white; border-radius: 20px; padding: 16px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); display: flex; flex-direction: column; gap: 8px; }
        .bc-header { display: flex; align-items: center; justify-content: space-between; }
        .bc-cat { display: flex; align-items: center; gap: 8px; }
        .bc-icon { font-size: 1.2rem; }
        .bc-name { font-weight: 700; font-size: 0.875rem; color: var(--chocolate-600); }
        .bc-status { font-size: 0.75rem; font-weight: 800; }
        .bc-amounts { display: flex; align-items: baseline; gap: 4px; }
        .bc-spent { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-700); }
        .bc-divider { color: var(--chocolate-300); }
        .bc-total { font-size: 0.85rem; font-weight: 600; color: var(--chocolate-400); }
        .bc-remaining { font-size: 0.75rem; font-weight: 700; color: var(--chocolate-400); }
        .bc-actions { display: flex; gap: 4px; margin-top: 4px; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px 6px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
      `}</style>
    </div>
  )
}

function BudgetForm({ onClose, onSaved, categories, existing, month, year }: {
  onClose: () => void
  onSaved: () => void
  categories: ExpenseCategory[]
  existing?: Budget
  month: number
  year: number
}) {
  const { user } = useUser()
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? '')
  const [catId, setCatId] = useState(existing?.category_id ?? '')
  const [isTotal, setIsTotal] = useState(existing?.is_total_budget ?? false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { toast.error('Vui lòng nhập số tiền hợp lệ'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      amount: amt,
      category_id: isTotal ? null : (catId || null),
      month,
      year,
      is_total_budget: isTotal,
    }
    const { error } = existing
      ? await supabase.from('budgets').update(payload).eq('id', existing.id)
      : await supabase.from('budgets').upsert(payload, { onConflict: 'user_id,category_id,month,year' })
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success('Đã lưu ngân sách!')
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cài đặt ngân sách 💼</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="estimate-toggle">
              <input type="checkbox" checked={isTotal} onChange={e => setIsTotal(e.target.checked)} />
              <span>Ngân sách tổng (cho toàn bộ chi tiêu)</span>
            </label>
          </div>
          {!isTotal && (
            <div className="form-group">
              <label className="mochi-label">Danh mục</label>
              <select className="mochi-input" value={catId} onChange={e => setCatId(e.target.value)} required>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="mochi-label">Số tiền ngân sách (VND) *</label>
            <input type="number" className="mochi-input" placeholder="5000000" value={amount} onChange={e => setAmount(e.target.value)} min="1" required />
          </div>
          <div className="modal-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu lại'}</button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 440px; box-shadow: var(--shadow-xl); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .estimate-toggle { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; color: var(--chocolate-600); cursor: pointer; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; }
      `}</style>
    </div>
  )
}
