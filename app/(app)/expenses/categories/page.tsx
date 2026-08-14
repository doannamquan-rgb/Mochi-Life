'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatVND, formatVNDCompact, getPercent } from '@/lib/format'
import type { ExpenseCategory } from '@/lib/types'
import { notifyDataChanged } from '@/lib/events'
import { useDataChanged } from '@/hooks/use-data-changed'
import { useCallback } from 'react'

const DEFAULT_ICONS = ['🍜','🚌','🛍️','📚','💊','💄','🎮','🏠','📋','🎁','✈️','⭐','💰','🎉','💼','↩️','💡','🎵','🐾','🍕']

function CategoryForm({ onClose, onSaved, existing }: {
  onClose: () => void
  onSaved: () => void
  existing?: ExpenseCategory
}) {
  const { user } = useUser()
  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<'expense' | 'income'>(existing?.type ?? 'expense')
  const [icon, setIcon] = useState(existing?.icon ?? '⭐')
  const [color, setColor] = useState(existing?.color ?? '#FF7A5C')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) { toast.error('Vui lòng nhập tên danh mục'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      name,
      type,
      icon,
      color,
      is_default: false,
      sort_order: existing?.sort_order ?? 999,
    }
    const { error } = existing
      ? await supabase.from('expense_categories').update(payload).eq('id', existing.id)
      : await supabase.from('expense_categories').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật!' : 'Đã thêm danh mục mới! 🎉')
    notifyDataChanged('expenses', 'category')
    onSaved(); onClose()
  }

  const COLORS = ['#FF7A5C','#FFCA1A','#3BB88E','#8F71F5','#FF9A80','#5ECFAA','#A990FF','#FFD84D','#B8997A','#5C4033']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa danh mục' : 'Thêm danh mục'} 🏷️</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="mochi-label">Tên danh mục *</label>
            <input type="text" className="mochi-input" placeholder="Ăn uống" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="mochi-label">Loại</label>
            <div className="type-toggle">
              <button type="button" className={`type-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>💸 Chi tiêu</button>
              <button type="button" className={`type-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>💰 Thu nhập</button>
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Biểu tượng</label>
            <div className="icon-grid">
              {DEFAULT_ICONS.map(ic => (
                <button key={ic} type="button" className={`icon-select-btn ${icon === ic ? 'selected' : ''}`} onClick={() => setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Màu sắc</label>
            <div className="color-grid">
              {COLORS.map(c => (
                <button key={c} type="button" className={`color-btn ${color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
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

export default function CategoriesPage() {
  const { user } = useUser()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | undefined>()
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
    setCategories(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) loadData() }, [user, loadData])

  useDataChanged('expenses', loadData)

  async function deleteCategory(cat: ExpenseCategory) {
    if (cat.is_default) { toast.error('Không thể xóa danh mục mặc định'); return }
    if (!confirm(`Xóa danh mục "${cat.name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('expense_categories').delete().eq('id', cat.id)
    if (error) { toast.error('Lỗi: ' + error.message); return }
    toast.success('Đã xóa danh mục')
    notifyDataChanged('expenses', 'category')
    loadData()
  }

  async function initDefaults() {
    if (!user) return
    const supabase = createClient()
    const defaults = [
      { name: 'Ăn uống', icon: '🍜', color: '#FF7A5C', type: 'expense' as const },
      { name: 'Đi lại', icon: '🚌', color: '#FFCA1A', type: 'expense' as const },
      { name: 'Mua sắm', icon: '🛍️', color: '#8F71F5', type: 'expense' as const },
      { name: 'Học tập', icon: '📚', color: '#3BB88E', type: 'expense' as const },
      { name: 'Sức khỏe', icon: '💊', color: '#5ECFAA', type: 'expense' as const },
      { name: 'Giải trí', icon: '🎮', color: '#A990FF', type: 'expense' as const },
      { name: 'Nhà ở', icon: '🏠', color: '#FFD84D', type: 'expense' as const },
      { name: 'Khác', icon: '⭐', color: '#B8997A', type: 'expense' as const },
      { name: 'Lương', icon: '💰', color: '#3BB88E', type: 'income' as const },
      { name: 'Thưởng', icon: '🎉', color: '#FFCA1A', type: 'income' as const },
      { name: 'Làm thêm', icon: '💼', color: '#5ECFAA', type: 'income' as const },
      { name: 'Khác', icon: '⭐', color: '#B8997A', type: 'income' as const },
    ]
    const { error } = await supabase.from('expense_categories').insert(
      defaults.map((d, i) => ({ ...d, user_id: user.id, is_default: true, sort_order: i + 1 }))
    )
    if (error) { toast.error('Lỗi: ' + error.message); return }
    toast.success('Đã khởi tạo danh mục mặc định!')
    notifyDataChanged('expenses', 'category')
    loadData()
  }

  const filtered = categories.filter(c => filter === 'all' || c.type === filter)
  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏷️ Danh mục chi tiêu</h1>
          <p className="page-subtitle">{expenseCats.length} chi tiêu · {incomeCats.length} thu nhập</p>
        </div>
        <div className="header-actions">
          {categories.length === 0 && (
            <button onClick={initDefaults} className="mochi-btn mochi-btn-secondary mochi-btn-sm">✨ Khởi tạo mặc định</button>
          )}
          <button onClick={() => { setEditing(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
        </div>
      </div>

      <div className="type-filter">
        {(['all', 'expense', 'income'] as const).map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `Tất cả (${categories.length})` : f === 'expense' ? `💸 Chi tiêu (${expenseCats.length})` : `💰 Thu nhập (${incomeCats.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cats-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 18 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">🏷️</div>
          <h3>Chưa có danh mục nào</h3>
          <p>Thêm danh mục để phân loại chi tiêu của bạn</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="mochi-btn mochi-btn-secondary" onClick={initDefaults}>✨ Tạo mặc định</button>
            <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm mới</button>
          </div>
        </div>
      ) : (
        <div className="cats-grid">
          {filtered.map(cat => (
            <div key={cat.id} className="cat-card" style={{ borderTop: `3px solid ${cat.color}` }}>
              <div className="cat-icon" style={{ background: `${cat.color}20` }}>{cat.icon}</div>
              <div className="cat-info">
                <div className="cat-name">{cat.name}</div>
                <div className="cat-type" style={{ color: cat.type === 'expense' ? '#FF7A5C' : '#3BB88E' }}>
                  {cat.type === 'expense' ? '💸 Chi tiêu' : '💰 Thu nhập'}
                </div>
                {cat.is_default && <span className="default-badge">Mặc định</span>}
              </div>
              <div className="cat-actions">
                <button className="icon-btn" onClick={() => { setEditing(cat); setShowForm(true) }}>✏️</button>
                {!cat.is_default && (
                  <button className="icon-btn" onClick={() => deleteCategory(cat)}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CategoryForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSaved={loadData}
          existing={editing}
        />
      )}

      <style jsx>{`
        .page { max-width: 800px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; }
        .type-filter { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-btn { padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .filter-btn.active { background: var(--cheese-400); border-color: var(--cheese-400); color: var(--chocolate-700); }
        .cats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .cat-card { background: white; border-radius: 18px; padding: 16px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); display: flex; align-items: center; gap: 12px; }
        .cat-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
        .cat-info { flex: 1; min-width: 0; }
        .cat-name { font-weight: 800; font-size: 0.9rem; color: var(--chocolate-600); margin-bottom: 3px; }
        .cat-type { font-size: 0.72rem; font-weight: 700; }
        .default-badge { display: inline-block; font-size: 0.62rem; background: var(--cream); color: var(--chocolate-400); padding: 1px 7px; border-radius: 999px; font-weight: 700; margin-top: 3px; }
        .cat-actions { display: flex; gap: 2px; flex-shrink: 0; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px 5px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 460px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .type-toggle { display: flex; gap: 8px; }
        .type-btn { flex: 1; padding: 10px; border-radius: 14px; border: 1.5px solid var(--chocolate-200); background: white; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .type-btn.active.expense { background: var(--peach-100); border-color: var(--peach-400); color: var(--peach-500); }
        .type-btn.active.income { background: var(--mint-100); border-color: var(--mint-400); color: var(--mint-500); }
        .icon-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; }
        .icon-select-btn { width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid var(--chocolate-100); background: white; font-size: 1.1rem; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .icon-select-btn.selected { background: var(--cheese-100); border-color: var(--cheese-400); transform: scale(1.15); }
        .color-grid { display: flex; gap: 8px; flex-wrap: wrap; }
        .color-btn { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: all 0.15s; }
        .color-btn.selected { border-color: var(--chocolate-600); transform: scale(1.2); }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; }
        @media (max-width: 480px) { .icon-grid { grid-template-columns: repeat(7, 1fr); } }
      `}</style>
    </div>
  )
}
