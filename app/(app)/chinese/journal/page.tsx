'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { useMochiReaction } from '@/hooks/use-mochi-reaction'
import { formatDate, todayString } from '@/lib/date-utils'
import type { StudySession } from '@/lib/types'

function JournalForm({ onClose, onSaved, existing }: {
  onClose: () => void
  onSaved: () => void
  existing?: StudySession
}) {
  const { user } = useUser()
  const { triggerReaction } = useMochiReaction()
  const [date, setDate] = useState(existing?.session_date ?? todayString())
  const [newWords, setNewWords] = useState(existing?.new_words_count?.toString() ?? '0')
  const [reviewWords, setReviewWords] = useState(existing?.reviewed_words_count?.toString() ?? '0')
  const [grammarPoints, setGrammarPoints] = useState(existing?.grammar_points_count?.toString() ?? '0')
  const [minutes, setMinutes] = useState(existing?.duration_minutes?.toString() ?? '')
  const [lessonName, setLessonName] = useState(existing?.lesson_name ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!minutes || Number(minutes) <= 0) { toast.error('Vui lòng nhập thời gian học'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      session_date: date,
      new_words_count: Number(newWords) || 0,
      reviewed_words_count: Number(reviewWords) || 0,
      grammar_points_count: Number(grammarPoints) || 0,
      duration_minutes: Number(minutes),
      lesson_name: lessonName || null,
      note: note || null,
      is_auto_generated: false,
    }
    const { error } = existing
      ? await supabase.from('study_sessions').update(payload).eq('id', existing.id)
      : await supabase.from('study_sessions').upsert(payload, { onConflict: 'user_id,session_date' })
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật!' : 'Đã ghi buổi học! 🎉')
    // Fire Smart Reaction only on new sessions (not edits)
    if (!existing) {
      triggerReaction('study_session_completed', { dedupKey: date, delayMs: 400 })
    }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa buổi học' : 'Ghi buổi học'} 📝</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Ngày *</label>
              <input type="date" className="mochi-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="mochi-label">Thời gian (phút) *</label>
              <input type="number" className="mochi-input" placeholder="30" value={minutes} onChange={e => setMinutes(e.target.value)} min="1" required />
            </div>
          </div>
          <div className="form-row three">
            <div className="form-group">
              <label className="mochi-label">Từ mới</label>
              <input type="number" className="mochi-input" placeholder="0" value={newWords} onChange={e => setNewWords(e.target.value)} min="0" />
            </div>
            <div className="form-group">
              <label className="mochi-label">Từ đã ôn</label>
              <input type="number" className="mochi-input" placeholder="0" value={reviewWords} onChange={e => setReviewWords(e.target.value)} min="0" />
            </div>
            <div className="form-group">
              <label className="mochi-label">Ngữ pháp</label>
              <input type="number" className="mochi-input" placeholder="0" value={grammarPoints} onChange={e => setGrammarPoints(e.target.value)} min="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Bài học / Chủ đề</label>
            <input type="text" className="mochi-input" placeholder="Bài 5: Mua sắm" value={lessonName} onChange={e => setLessonName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="mochi-label">Ghi chú / Cảm nhận</label>
            <textarea className="mochi-input" placeholder="Hôm nay học được gì? Cảm nhận thế nào?" value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div className="modal-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu buổi học'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function JournalContent() {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add')
  const [editing, setEditing] = useState<StudySession | undefined>()

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(60)
    setSessions(data ?? [])
    setLoading(false)
  }

  async function deleteSession(id: string) {
    if (!confirm('Xóa buổi học này?')) return
    const supabase = createClient()
    await supabase.from('study_sessions').delete().eq('id', id)
    toast.success('Đã xóa')
    loadData()
  }

  const totalWords = sessions.reduce((s, x) => s + x.new_words_count, 0)
  const totalMinutes = sessions.reduce((s, x) => s + x.duration_minutes, 0)
  const totalDays = new Set(sessions.map(s => s.session_date)).size

  // Streak
  let streak = 0
  const dateSet = new Set(sessions.map(s => s.session_date))
  const d = new Date()
  while (true) {
    const ds = d.toISOString().split('T')[0]
    if (dateSet.has(ds)) { streak++; d.setDate(d.getDate() - 1) } else break
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Nhật ký học tập</h1>
          <p className="page-subtitle">{sessions.length} buổi học · {streak} ngày liên tục 🔥</p>
        </div>
        <button className="mochi-btn mochi-btn-primary mochi-btn-sm" onClick={() => { setEditing(undefined); setShowForm(true) }}>+ Ghi buổi học</button>
      </div>

      {/* Summary */}
      <div className="summary-row">
        <div className="sum-card">
          <div className="sc-emoji">📅</div>
          <div className="sc-val">{totalDays}</div>
          <div className="sc-lbl">Ngày học</div>
        </div>
        <div className="sum-card">
          <div className="sc-emoji">🔥</div>
          <div className="sc-val">{streak}</div>
          <div className="sc-lbl">Chuỗi ngày</div>
        </div>
        <div className="sum-card">
          <div className="sc-emoji">📖</div>
          <div className="sc-val">{totalWords}</div>
          <div className="sc-lbl">Từ mới</div>
        </div>
        <div className="sum-card">
          <div className="sc-emoji">⏱️</div>
          <div className="sc-val">{totalMinutes}</div>
          <div className="sc-lbl">Tổng phút</div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => <div key={i} className="mochi-skeleton" style={{ height: 90, borderRadius: 18 }} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">📖</div>
          <h3>Chưa có buổi học nào</h3>
          <p>Ghi lại buổi học đầu tiên của bạn!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Ghi ngay</button>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map(s => (
            <div key={s.id} className={`session-item ${s.is_auto_generated ? 'auto' : ''}`}>
              <div className="si-date">
                <div className="si-day">{new Date(s.session_date).getDate()}</div>
                <div className="si-month">{new Date(s.session_date).toLocaleString('vi', { month: 'short' })}</div>
              </div>
              <div className="si-info">
                {s.lesson_name && <div className="si-lesson">{s.lesson_name}</div>}
                <div className="si-stats">
                  {s.new_words_count > 0 && <span>📖 {s.new_words_count} từ mới</span>}
                  {s.reviewed_words_count > 0 && <span>🔄 {s.reviewed_words_count} ôn</span>}
                  {s.grammar_points_count > 0 && <span>✍️ {s.grammar_points_count} ngữ pháp</span>}
                  <span>⏱️ {s.duration_minutes} phút</span>
                </div>
                {s.note && <div className="si-note">💬 {s.note}</div>}
              </div>
              {s.is_auto_generated && <span className="auto-badge">Tự động</span>}
              <div className="si-actions">
                <button className="icon-btn" onClick={() => { setEditing(s); setShowForm(true) }}>✏️</button>
                <button className="icon-btn" onClick={() => deleteSession(s.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <JournalForm onClose={() => { setShowForm(false); setEditing(undefined) }} onSaved={loadData} existing={editing} />
      )}

      <style jsx>{`
        .page { max-width: 800px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .sum-card { background: white; border-radius: 18px; padding: 14px; text-align: center; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); }
        .sc-emoji { font-size: 1.3rem; margin-bottom: 4px; }
        .sc-val { font-size: 1.3rem; font-weight: 800; color: var(--chocolate-600); }
        .sc-lbl { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-top: 2px; }
        .sessions-list { display: flex; flex-direction: column; gap: 8px; }
        .session-item { background: white; border-radius: 18px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 14px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); }
        .session-item.auto { border-left: 3px solid var(--lavender-300); }
        .si-date { flex-shrink: 0; width: 40px; text-align: center; background: var(--lavender-50); border-radius: 12px; padding: 8px 4px; }
        .si-day { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); line-height: 1; }
        .si-month { font-size: 0.65rem; font-weight: 700; color: var(--chocolate-400); margin-top: 2px; }
        .si-info { flex: 1; min-width: 0; }
        .si-lesson { font-weight: 700; font-size: 0.9rem; color: var(--chocolate-600); margin-bottom: 4px; }
        .si-stats { display: flex; gap: 10px; font-size: 0.78rem; font-weight: 600; color: var(--chocolate-500); flex-wrap: wrap; }
        .si-note { font-size: 0.8rem; color: var(--chocolate-400); font-weight: 600; margin-top: 4px; white-space: pre-wrap; }
        .auto-badge { font-size: 0.65rem; background: var(--lavender-100); color: var(--lavender-500); padding: 2px 8px; border-radius: 999px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
        .si-actions { display: flex; gap: 2px; flex-shrink: 0; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px 5px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 500px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-row.three { grid-template-columns: 1fr 1fr 1fr; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; }
        @media (max-width: 480px) { .summary-row { grid-template-columns: 1fr 1fr; } .form-row { grid-template-columns: 1fr; } .form-row.three { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}

export default function JournalPage() {
  return <Suspense><JournalContent /></Suspense>
}
