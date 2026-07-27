'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatDate, todayString } from '@/lib/date-utils'
import { MEMORY_LEVEL_LABELS, WORD_TYPE_LABELS } from '@/lib/format'
import { calculateNextReview } from '@/lib/spaced-repetition'
import type { HskVocabulary, HskLesson, MemoryLevel } from '@/lib/types'

const MEMORY_COLORS: Record<string, string> = {
  not_learned: '#B8997A',
  hard: '#FF7A5C',
  learning: '#FFCA1A',
  learned: '#3BB88E',
  mastered: '#8F71F5',
}

function VocabForm({ onClose, onSaved, lessons, existing }: {
  onClose: () => void
  onSaved: () => void
  lessons: HskLesson[]
  existing?: HskVocabulary
}) {
  const { user } = useUser()
  const [hanzi, setHanzi] = useState(existing?.hanzi ?? '')
  const [pinyin, setPinyin] = useState(existing?.pinyin ?? '')
  const [meaning, setMeaning] = useState(existing?.meaning ?? '')
  const [wordType, setWordType] = useState(existing?.word_type ?? '')
  const [exCn, setExCn] = useState(existing?.example_cn ?? '')
  const [exPinyin, setExPinyin] = useState(existing?.example_pinyin ?? '')
  const [exVi, setExVi] = useState(existing?.example_vi ?? '')
  const [lessonId, setLessonId] = useState(existing?.lesson_id ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hanzi || !pinyin || !meaning) { toast.error('Vui lòng nhập Hán tự, Pinyin và nghĩa'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const payload = {
      user_id: user.id,
      hanzi,
      pinyin,
      meaning,
      word_type: wordType || null,
      example_cn: exCn || null,
      example_pinyin: exPinyin || null,
      example_vi: exVi || null,
      lesson_id: lessonId || null,
      note: note || null,
      first_learned_at: existing?.first_learned_at ?? now,
    }
    const { error } = existing
      ? await supabase.from('hsk_vocabulary').update(payload).eq('id', existing.id)
      : await supabase.from('hsk_vocabulary').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật từ vựng!' : 'Đã thêm từ vựng mới! 🎉')
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa từ vựng' : 'Thêm từ vựng'} 🈶</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Hán tự *</label>
              <input type="text" className="mochi-input hanzi-input" placeholder="你好" value={hanzi} onChange={e => setHanzi(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="mochi-label">Pinyin *</label>
              <input type="text" className="mochi-input" placeholder="nǐ hǎo" value={pinyin} onChange={e => setPinyin(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Nghĩa tiếng Việt *</label>
            <input type="text" className="mochi-input" placeholder="Xin chào" value={meaning} onChange={e => setMeaning(e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Loại từ</label>
              <select className="mochi-input" value={wordType} onChange={e => setWordType(e.target.value)}>
                <option value="">-- Chọn --</option>
                {Object.entries(WORD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
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
            <label className="mochi-label">Câu ví dụ (Tiếng Trung)</label>
            <input type="text" className="mochi-input hanzi-input" placeholder="你好，我是学生。" value={exCn} onChange={e => setExCn(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="mochi-label">Pinyin câu ví dụ</label>
            <input type="text" className="mochi-input" placeholder="Nǐ hǎo, wǒ shì xuéshēng." value={exPinyin} onChange={e => setExPinyin(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="mochi-label">Dịch nghĩa câu ví dụ</label>
            <input type="text" className="mochi-input" placeholder="Xin chào, tôi là học sinh." value={exVi} onChange={e => setExVi(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="mochi-label">Ghi chú</label>
            <textarea className="mochi-input" value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

function VocabPageContent() {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [vocab, setVocab] = useState<HskVocabulary[]>([])
  const [lessons, setLessons] = useState<HskLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add')
  const [editing, setEditing] = useState<HskVocabulary | undefined>()
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterLesson, setFilterLesson] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'due'>('list')
  const [showFavorites, setShowFavorites] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const [vocabRes, lessonRes] = await Promise.all([
      supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('hsk_lessons').select('*').eq('user_id', user.id).order('lesson_number'),
    ])
    setVocab(vocabRes.data ?? [])
    setLessons(lessonRes.data ?? [])
    setLoading(false)
  }

  async function toggleFavorite(v: HskVocabulary) {
    const supabase = createClient()
    await supabase.from('hsk_vocabulary').update({ is_favorite: !v.is_favorite }).eq('id', v.id)
    setVocab(prev => prev.map(x => x.id === v.id ? { ...x, is_favorite: !x.is_favorite } : x))
  }

  async function deleteVocab(id: string) {
    if (!confirm('Xóa từ vựng này?')) return
    const supabase = createClient()
    await supabase.from('hsk_vocabulary').delete().eq('id', id)
    toast.success('Đã xóa')
    loadData()
  }

  function exportCSV() {
    const header = 'Hán tự,Pinyin,Nghĩa,Loại từ,Mức độ nhớ,Số lần đúng,Số lần sai'
    const rows = filteredVocab.map(v =>
      `"${v.hanzi}","${v.pinyin}","${v.meaning}","${v.word_type ?? ''}","${MEMORY_LEVEL_LABELS[v.memory_level]?.label ?? ''}",${v.correct_count},${v.incorrect_count}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tu-vung.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất CSV!')
  }

  const now = new Date()
  const dueVocab = vocab.filter(v => new Date(v.next_review_at) <= now)

  let filtered = viewMode === 'due' ? dueVocab : vocab
  if (showFavorites) filtered = filtered.filter(v => v.is_favorite)
  if (filterLevel) filtered = filtered.filter(v => v.memory_level === filterLevel)
  if (filterLesson) filtered = filtered.filter(v => v.lesson_id === filterLesson)
  if (search) filtered = filtered.filter(v =>
    v.hanzi.includes(search) ||
    v.pinyin.toLowerCase().includes(search.toLowerCase()) ||
    v.meaning.toLowerCase().includes(search.toLowerCase())
  )
  const filteredVocab = filtered

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔤 Từ vựng HSK 3</h1>
          <p className="page-subtitle">{vocab.length} từ · {dueVocab.length} cần ôn hôm nay</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 CSV</button>
          <Link href="/chinese/vocabulary/flashcard" className="mochi-btn mochi-btn-secondary mochi-btn-sm">🃏 Flashcard</Link>
          <Link href="/chinese/vocabulary/quiz" className="mochi-btn mochi-btn-secondary mochi-btn-sm">❓ Quiz</Link>
          <button onClick={() => { setEditing(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
        </div>
      </div>

      {/* View mode & filters */}
      <div className="controls-row">
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Tất cả ({vocab.length})</button>
          <button className={`view-btn ${viewMode === 'due' ? 'active due-mode' : ''}`} onClick={() => setViewMode('due')}>Cần ôn ({dueVocab.length})</button>
        </div>
        <button
          className={`fav-btn ${showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(!showFavorites)}
        >
          {showFavorites ? '❤️' : '🤍'} Yêu thích
        </button>
      </div>

      <div className="filters-row">
        <input
          type="text"
          className="mochi-input search-input"
          placeholder="🔍 Tìm Hán tự, Pinyin, nghĩa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="mochi-input" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">Tất cả mức độ</option>
          {Object.entries(MEMORY_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="mochi-input" value={filterLesson} onChange={e => setFilterLesson(e.target.value)}>
          <option value="">Tất cả bài học</option>
          {lessons.map(l => <option key={l.id} value={l.id}>Bài {l.lesson_number}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 16 }} />)}
        </div>
      ) : filteredVocab.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">😸</div>
          <h3>{viewMode === 'due' ? 'Không có từ nào cần ôn hôm nay!' : 'Chưa có từ vựng nào'}</h3>
          <p>{viewMode === 'due' ? 'Tuyệt vời! Bạn đã ôn tập đầy đủ 🎉' : 'Hãy thêm từ vựng đầu tiên nhé!'}</p>
          {viewMode !== 'due' && <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm từ vựng</button>}
        </div>
      ) : (
        <div className="vocab-list">
          {filteredVocab.map(v => (
            <div key={v.id} className={`vocab-item ${new Date(v.next_review_at) <= now ? 'due' : ''}`}>
              <div className="vocab-hanzi">{v.hanzi}</div>
              <div className="vocab-info">
                <div className="vocab-pinyin">{v.pinyin}</div>
                <div className="vocab-meaning">{v.meaning}</div>
                {v.word_type && <span className="word-type-badge">{WORD_TYPE_LABELS[v.word_type] ?? v.word_type}</span>}
              </div>
              <div className="vocab-meta">
                <span
                  className="memory-badge"
                  style={{ background: `${MEMORY_COLORS[v.memory_level]}20`, color: MEMORY_COLORS[v.memory_level] }}
                >
                  {MEMORY_LEVEL_LABELS[v.memory_level]?.label}
                </span>
                <div className="vocab-stats">
                  <span className="stat-good">✓{v.correct_count}</span>
                  <span className="stat-bad">✗{v.incorrect_count}</span>
                </div>
              </div>
              <div className="vocab-actions">
                <button onClick={() => toggleFavorite(v)} className="fav-icon-btn">{v.is_favorite ? '❤️' : '🤍'}</button>
                <button onClick={() => { setEditing(v); setShowForm(true) }} className="icon-btn">✏️</button>
                <button onClick={() => deleteVocab(v.id)} className="icon-btn">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <VocabForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSaved={loadData}
          lessons={lessons}
          existing={editing}
        />
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .controls-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .view-toggle { display: flex; background: var(--cream); border-radius: 999px; padding: 3px; }
        .view-btn { padding: 6px 14px; border-radius: 999px; border: none; background: transparent; color: var(--chocolate-400); font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .view-btn.active { background: white; color: var(--chocolate-600); box-shadow: var(--shadow-xs); }
        .view-btn.due-mode { color: var(--lavender-400); }
        .fav-btn { padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .fav-btn.active { background: var(--peach-100); border-color: var(--peach-400); }
        .filters-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; }
        .vocab-list { display: flex; flex-direction: column; gap: 8px; }
        .vocab-item { background: white; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); transition: all 0.15s; }
        .vocab-item.due { border-left: 3px solid var(--lavender-400); }
        .vocab-hanzi { font-size: 1.6rem; font-weight: 800; color: var(--chocolate-700); min-width: 52px; text-align: center; line-height: 1; }
        .vocab-info { flex: 1; min-width: 0; }
        .vocab-pinyin { font-size: 0.85rem; font-weight: 600; color: var(--lavender-400); font-style: italic; }
        .vocab-meaning { font-size: 0.92rem; font-weight: 700; color: var(--chocolate-600); }
        .word-type-badge { display: inline-block; font-size: 0.65rem; background: var(--cheese-100); color: var(--chocolate-500); padding: 1px 7px; border-radius: 999px; font-weight: 700; margin-top: 3px; }
        .vocab-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .memory-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
        .vocab-stats { display: flex; gap: 6px; font-size: 0.72rem; font-weight: 700; }
        .stat-good { color: var(--mint-400); }
        .stat-bad { color: var(--peach-400); }
        .vocab-actions { display: flex; gap: 2px; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.95rem; padding: 4px 5px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .fav-icon-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px 5px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 520px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .hanzi-input { font-size: 1.2rem; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        @media (max-width: 640px) {
          .vocab-item { flex-wrap: wrap; }
          .form-row { grid-template-columns: 1fr; }
          .header-actions { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

export default function VocabularyPage() {
  return <Suspense><VocabPageContent /></Suspense>
}
