'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { HskGrammar, HskLesson, GrammarStatus } from '@/lib/types'

const STATUS_LABELS: Record<GrammarStatus, { label: string; color: string }> = {
  not_learned: { label: 'Chưa học', color: '#B8997A' },
  in_progress: { label: 'Đang học', color: '#FFCA1A' },
  learned: { label: 'Đã học', color: '#3BB88E' },
  mastered: { label: 'Thành thạo', color: '#8F71F5' },
}

function GrammarForm({ onClose, onSaved, lessons, existing }: {
  onClose: () => void
  onSaved: () => void
  lessons: HskLesson[]
  existing?: HskGrammar
}) {
  const { user } = useUser()
  const [structureName, setStructureName] = useState(existing?.structure_name ?? '')
  const [formula, setFormula] = useState(existing?.formula ?? '')
  const [meaning, setMeaning] = useState(existing?.meaning ?? '')
  const [usageDesc, setUsageDesc] = useState(existing?.usage_desc ?? '')
  const [exCn, setExCn] = useState(existing?.example_cn ?? '')
  const [exPinyin, setExPinyin] = useState(existing?.example_pinyin ?? '')
  const [exVi, setExVi] = useState(existing?.example_vi ?? '')
  const [lessonId, setLessonId] = useState(existing?.lesson_id ?? '')
  const [status, setStatus] = useState<GrammarStatus>(existing?.status ?? 'not_learned')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!structureName || !meaning) { toast.error('Vui lòng nhập tên cấu trúc và nghĩa'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      structure_name: structureName,
      formula: formula || null,
      meaning,
      usage_desc: usageDesc || null,
      example_cn: exCn || null,
      example_pinyin: exPinyin || null,
      example_vi: exVi || null,
      lesson_id: lessonId || null,
      status,
      notes: notes || null,
      learned_at: (status === 'learned' || status === 'mastered') && !existing?.learned_at ? new Date().toISOString() : existing?.learned_at ?? null,
    }
    const { error } = existing
      ? await supabase.from('hsk_grammar').update(payload).eq('id', existing.id)
      : await supabase.from('hsk_grammar').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật ngữ pháp!' : 'Đã thêm cấu trúc ngữ pháp! 🎉')
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa ngữ pháp' : 'Thêm ngữ pháp'} ✍️</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="mochi-label">Tên cấu trúc *</label>
            <input type="text" className="mochi-input" placeholder="是...的 (shì...de)" value={structureName} onChange={e => setStructureName(e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Công thức</label>
              <input type="text" className="mochi-input" placeholder="S + 是 + O + 的" value={formula} onChange={e => setFormula(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="mochi-label">Bài học</label>
              <select className="mochi-input" value={lessonId} onChange={e => setLessonId(e.target.value)}>
                <option value="">-- Không thuộc bài nào --</option>
                {lessons.map(l => <option key={l.id} value={l.id}>Bài {l.lesson_number}: {l.title}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Nghĩa / Chức năng *</label>
            <input type="text" className="mochi-input" placeholder="Nhấn mạnh thời gian, địa điểm, phương thức" value={meaning} onChange={e => setMeaning(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="mochi-label">Cách dùng</label>
            <textarea className="mochi-input" placeholder="Giải thích chi tiết cách sử dụng..." value={usageDesc} onChange={e => setUsageDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="mochi-label">Câu ví dụ (Tiếng Trung)</label>
            <input type="text" className="mochi-input hanzi-input" value={exCn} onChange={e => setExCn(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Pinyin ví dụ</label>
              <input type="text" className="mochi-input" value={exPinyin} onChange={e => setExPinyin(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="mochi-label">Dịch nghĩa</label>
              <input type="text" className="mochi-input" value={exVi} onChange={e => setExVi(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Trạng thái học</label>
            <div className="status-btns">
              {(Object.keys(STATUS_LABELS) as GrammarStatus[]).map(s => (
                <button key={s} type="button"
                  className={`status-pill ${status === s ? 'active' : ''}`}
                  style={status === s ? { background: `${STATUS_LABELS[s].color}20`, borderColor: STATUS_LABELS[s].color, color: STATUS_LABELS[s].color } : {}}
                  onClick={() => setStatus(s)}
                >{STATUS_LABELS[s].label}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Ghi chú</label>
            <textarea className="mochi-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

export default function GrammarPage() {
  const { user } = useUser()
  const [grammar, setGrammar] = useState<HskGrammar[]>([])
  const [lessons, setLessons] = useState<HskLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<HskGrammar | undefined>()
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const [grammarRes, lessonRes] = await Promise.all([
      supabase.from('hsk_grammar').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('hsk_lessons').select('*').eq('user_id', user.id).order('lesson_number'),
    ])
    setGrammar(grammarRes.data ?? [])
    setLessons(lessonRes.data ?? [])
    setLoading(false)
  }

  async function updateStatus(item: HskGrammar, newStatus: GrammarStatus) {
    const supabase = createClient()
    const updates: Partial<HskGrammar> = { status: newStatus }
    if ((newStatus === 'learned' || newStatus === 'mastered') && !item.learned_at) {
      updates.learned_at = new Date().toISOString()
    }
    await supabase.from('hsk_grammar').update(updates).eq('id', item.id)
    toast.success('Đã cập nhật trạng thái!')
    loadData()
  }

  async function deleteGrammar(id: string) {
    if (!confirm('Xóa cấu trúc ngữ pháp này?')) return
    const supabase = createClient()
    await supabase.from('hsk_grammar').delete().eq('id', id)
    toast.success('Đã xóa')
    loadData()
  }

  const filtered = grammar.filter(g => {
    if (filterStatus && g.status !== filterStatus) return false
    if (search && !g.structure_name.toLowerCase().includes(search.toLowerCase()) && !g.meaning.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusCounts = grammar.reduce((acc, g) => { acc[g.status] = (acc[g.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">✍️ Ngữ pháp HSK 3</h1>
          <p className="page-subtitle">{grammar.length} cấu trúc · {statusCounts['learned'] ?? 0 + (statusCounts['mastered'] ?? 0)} đã học</p>
        </div>
        <button className="mochi-btn mochi-btn-primary mochi-btn-sm" onClick={() => { setEditing(undefined); setShowForm(true) }}>+ Thêm</button>
      </div>

      <div className="filter-chips">
        <button className={`chip ${filterStatus === '' ? 'active' : ''}`} onClick={() => setFilterStatus('')}>Tất cả ({grammar.length})</button>
        {(Object.keys(STATUS_LABELS) as GrammarStatus[]).map(s => (
          <button key={s} className={`chip ${filterStatus === s ? 'active' : ''}`}
            style={filterStatus === s ? { background: `${STATUS_LABELS[s].color}20`, borderColor: STATUS_LABELS[s].color, color: STATUS_LABELS[s].color } : {}}
            onClick={() => setFilterStatus(s)}>
            {STATUS_LABELS[s].label} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      <input type="text" className="mochi-input" placeholder="🔍 Tìm cấu trúc ngữ pháp..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16 }} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 18 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">✍️</div>
          <h3>Chưa có ngữ pháp nào</h3>
          <p>Thêm cấu trúc ngữ pháp để bổ sung kiến thức!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm ngữ pháp</button>
        </div>
      ) : (
        <div className="grammar-list">
          {filtered.map(g => {
            const isExpanded = expanded === g.id
            const statusInfo = STATUS_LABELS[g.status]
            return (
              <div key={g.id} className="grammar-card">
                <div className="gc-header" onClick={() => setExpanded(isExpanded ? null : g.id)}>
                  <div className="gc-left">
                    <span className="gc-structure">{g.structure_name}</span>
                    {g.formula && <span className="gc-formula">{g.formula}</span>}
                  </div>
                  <div className="gc-right">
                    <span className="gc-status-badge" style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>{statusInfo.label}</span>
                    <span className="gc-toggle">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                <div className="gc-meaning">{g.meaning}</div>

                {isExpanded && (
                  <div className="gc-details">
                    {g.usage_desc && <p className="gc-usage">{g.usage_desc}</p>}
                    {g.example_cn && (
                      <div className="gc-example">
                        <div className="gc-ex-cn hanzi-text">{g.example_cn}</div>
                        {g.example_pinyin && <div className="gc-ex-py">{g.example_pinyin}</div>}
                        {g.example_vi && <div className="gc-ex-vi">{g.example_vi}</div>}
                      </div>
                    )}
                    {g.notes && <p className="gc-notes">📝 {g.notes}</p>}
                    <div className="gc-status-row">
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--chocolate-400)' }}>Đổi trạng thái:</span>
                      {(Object.keys(STATUS_LABELS) as GrammarStatus[]).map(s => (
                        <button key={s} type="button"
                          className={`chip-sm ${g.status === s ? 'active' : ''}`}
                          style={g.status === s ? { background: `${STATUS_LABELS[s].color}20`, borderColor: STATUS_LABELS[s].color, color: STATUS_LABELS[s].color } : {}}
                          onClick={() => updateStatus(g, s)}
                        >{STATUS_LABELS[s].label}</button>
                      ))}
                    </div>
                    <div className="gc-actions">
                      <button className="mochi-btn mochi-btn-secondary mochi-btn-sm" onClick={() => { setEditing(g); setShowForm(true) }}>✏️ Sửa</button>
                      <button className="mochi-btn mochi-btn-ghost mochi-btn-sm" onClick={() => deleteGrammar(g.id)}>🗑️ Xóa</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <GrammarForm onClose={() => { setShowForm(false); setEditing(undefined) }} onSaved={loadData} lessons={lessons} existing={editing} />
      )}

      <style jsx>{`
        .page { max-width: 800px; margin: 0 auto; padding-bottom: 32px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .chip { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .chip.active { background: var(--cream); border-color: var(--chocolate-300); }
        .chip-sm { padding: 3px 10px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.72rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .chip-sm.active { background: var(--cream); }
        .grammar-list { display: flex; flex-direction: column; gap: 10px; }
        .grammar-card { background: white; border-radius: 18px; padding: 16px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); transition: box-shadow 0.15s; }
        .grammar-card:hover { box-shadow: var(--shadow-sm); }
        .gc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; cursor: pointer; }
        .gc-left { flex: 1; }
        .gc-structure { font-size: 1rem; font-weight: 800; color: var(--chocolate-700); display: block; margin-bottom: 3px; }
        .gc-formula { font-size: 0.78rem; font-weight: 600; color: var(--lavender-400); font-style: italic; background: var(--lavender-50); padding: 2px 8px; border-radius: 6px; }
        .gc-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .gc-status-badge { font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
        .gc-toggle { font-size: 0.7rem; color: var(--chocolate-300); }
        .gc-meaning { font-size: 0.875rem; font-weight: 600; color: var(--chocolate-500); margin-top: 6px; }
        .gc-details { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--chocolate-100); display: flex; flex-direction: column; gap: 12px; }
        .gc-usage { font-size: 0.875rem; color: var(--chocolate-500); font-weight: 600; margin: 0; line-height: 1.6; }
        .gc-example { background: var(--lavender-50); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .gc-ex-cn { font-size: 1rem; font-weight: 700; color: var(--chocolate-700); }
        .gc-ex-py { font-size: 0.8rem; color: var(--lavender-400); font-style: italic; }
        .gc-ex-vi { font-size: 0.82rem; color: var(--chocolate-500); font-weight: 600; }
        .gc-notes { font-size: 0.82rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .gc-status-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .gc-actions { display: flex; gap: 8px; }
        .hanzi-text { font-size: 1.1rem; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 560px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .hanzi-input { font-size: 1.1rem; }
        .status-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .status-pill { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; font-weight: 700; font-size: 0.78rem; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.15s; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; }
        @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
