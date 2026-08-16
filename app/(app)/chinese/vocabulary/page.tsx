'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { notifyDataChanged } from '@/lib/events'
import { toast } from 'sonner'
import { formatDate, todayString } from '@/lib/date-utils'
import { MEMORY_LEVEL_LABELS, WORD_TYPE_LABELS } from '@/lib/format'
import type { HskVocabulary, HskLesson, MemoryLevel } from '@/lib/types'

const MEMORY_COLORS: Record<string, string> = {
  not_learned: '#B8997A',
  hard: '#FF7A5C',
  learning: '#FFCA1A',
  learned: '#3BB88E',
  mastered: '#8F71F5',
}

function VocabForm({ onClose, onSaved, lessons, activeCourseId, existing }: {
  onClose: () => void
  onSaved: () => void
  lessons: HskLesson[]
  activeCourseId?: string
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
  const [isLearned, setIsLearned] = useState<boolean>(existing ? existing.memory_level !== 'not_learned' : false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ hanzi?: string; pinyin?: string; meaning?: string }>({})

  const formRef = useRef<HTMLDivElement>(null)
  const hanziInputRef = useRef<HTMLInputElement>(null)
  const hasScrolledRef = useRef(false)

  // Single-scroll behavior on mount
  useEffect(() => {
    if (!hasScrolledRef.current && formRef.current) {
      hasScrolledRef.current = true
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
        hanziInputRef.current?.focus({ preventScroll: true })
      })
    }
  }, [])

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!hanzi.trim()) errs.hanzi = 'Vui lòng nhập Hán tự'
    if (!pinyin.trim()) errs.pinyin = 'Vui lòng nhập Pinyin'
    if (!meaning.trim()) errs.meaning = 'Vui lòng nhập nghĩa tiếng Việt'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error('Vui lòng nhập đầy đủ Hán tự, Pinyin và nghĩa tiếng Việt')
      return
    }
    if (!user) return

    // If editing a word with review history and attempting to set to not_learned
    if (existing && existing.memory_level !== 'not_learned' && !isLearned) {
      const hasHistory = existing.correct_count > 0 || existing.incorrect_count > 0 || existing.sr_repetitions > 0
      if (hasHistory) {
        const confirmReset = confirm(
          `Từ "${existing.hanzi}" đã có lịch sử học (${existing.correct_count} lần đúng, ${existing.incorrect_count} lần sai). Chuyển về "Chưa học" sẽ không xóa lịch sử đếm nhưng sẽ đưa từ ra khỏi danh sách ôn tập. Bạn có muốn tiếp tục?`
        )
        if (!confirmReset) return
      }
    }

    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Determine memory_level & learning timestamps
    let targetMemoryLevel: MemoryLevel = 'not_learned'
    let firstLearnedAt = existing?.first_learned_at ?? null
    let nextReviewAt = existing?.next_review_at ?? now.toISOString()
    let srInterval = existing?.sr_interval_days ?? 0
    let srEase = existing?.sr_ease_factor ?? 2.5
    let srReps = existing?.sr_repetitions ?? 0

    if (isLearned) {
      targetMemoryLevel = existing && existing.memory_level !== 'not_learned' ? existing.memory_level : 'learned'
      if (!firstLearnedAt) {
        firstLearnedAt = now.toISOString()
      }
      if (!existing || existing.memory_level === 'not_learned') {
        nextReviewAt = tomorrow.toISOString()
        srInterval = 1
        srReps = 1
      }
    } else {
      targetMemoryLevel = 'not_learned'
    }

    const payload = {
      user_id: user.id,
      course_id: existing?.course_id ?? activeCourseId ?? null,
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      meaning: meaning.trim(),
      word_type: wordType || null,
      example_cn: exCn.trim() || null,
      example_pinyin: exPinyin.trim() || null,
      example_vi: exVi.trim() || null,
      lesson_id: lessonId || null,
      note: note.trim() || null,
      memory_level: targetMemoryLevel,
      first_learned_at: firstLearnedAt,
      next_review_at: nextReviewAt,
      sr_interval_days: srInterval,
      sr_ease_factor: srEase,
      sr_repetitions: srReps,
    }

    let res = existing
      ? await supabase.from('hsk_vocabulary').update(payload).eq('id', existing.id)
      : await supabase.from('hsk_vocabulary').insert(payload)

    if (res.error && res.error.message.includes('course_id')) {
      const { course_id, ...payloadWithoutCourse } = payload
      res = existing
        ? await supabase.from('hsk_vocabulary').update(payloadWithoutCourse).eq('id', existing.id)
        : await supabase.from('hsk_vocabulary').insert(payloadWithoutCourse)
    }

    if (res.error) {
      toast.error('Không thể lưu từ vựng: ' + res.error.message)
      setLoading(false)
      return
    }

    if (isLearned) {
      const { awardXP } = await import('@/lib/gamification')
      awardXP(user.id, 5, 'vocab_learned', `vocab:${existing?.id || hanzi.trim()}`)
    }

    toast.success(existing ? 'Đã cập nhật từ vựng thành công!' : `Đã thêm từ vựng "${hanzi}" thành công! 🎉`)
    notifyDataChanged('chinese', 'vocabulary', payload.course_id ?? undefined)
    onSaved()
    onClose()
  }

  return (
    <div ref={formRef} className="inline-form-card">
      <div className="inline-form-inner">
        <div className="inline-form-header">
          <h2>{existing ? 'Sửa từ vựng' : 'Thêm từ vựng'} 🈶</h2>
          <button type="button" onClick={onClose} className="inline-close-btn" title="Hủy">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="inline-form-body">
          {/* Section 1: Main Info */}
          <div className="form-section-title">📌 Thông tin chính</div>

          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Hán tự *</label>
              <input
                ref={hanziInputRef}
                type="text"
                className="mochi-input hanzi-input"
                placeholder="你好"
                value={hanzi}
                onChange={e => {
                  setHanzi(e.target.value)
                  if (errors.hanzi) setErrors(prev => ({ ...prev, hanzi: undefined }))
                }}
                required
              />
              {errors.hanzi && <span className="field-error-msg">{errors.hanzi}</span>}
            </div>

            <div className="form-group">
              <label className="mochi-label">Pinyin *</label>
              <input
                type="text"
                className="mochi-input"
                placeholder="nǐ hǎo"
                value={pinyin}
                onChange={e => {
                  setPinyin(e.target.value)
                  if (errors.pinyin) setErrors(prev => ({ ...prev, pinyin: undefined }))
                }}
                required
              />
              {errors.pinyin && <span className="field-error-msg">{errors.pinyin}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="mochi-label">Nghĩa tiếng Việt *</label>
            <input
              type="text"
              className="mochi-input"
              placeholder="Xin chào"
              value={meaning}
              onChange={e => {
                setMeaning(e.target.value)
                if (errors.meaning) setErrors(prev => ({ ...prev, meaning: undefined }))
              }}
              required
            />
            {errors.meaning && <span className="field-error-msg">{errors.meaning}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Loại từ</label>
              <select className="mochi-input" value={wordType} onChange={e => setWordType(e.target.value)}>
                <option value="">-- Chọn loại từ --</option>
                {Object.entries(WORD_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="mochi-label">Bài học</label>
              <select className="mochi-input" value={lessonId} onChange={e => setLessonId(e.target.value)}>
                <option value="">-- Không thuộc bài nào --</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>Bài {l.lesson_number}: {l.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Learning Status */}
          <div className="form-section-title">🎯 Trạng thái học</div>
          <fieldset className="mochi-fieldset">
            <legend className="mochi-legend">Trạng thái từ vựng *</legend>
            <div className="vocab-status-grid">
              <label className={`vocab-status-card ${!isLearned ? 'selected-not-learned' : ''}`}>
                <input
                  type="radio"
                  name="vocab-learning-status"
                  checked={!isLearned}
                  onChange={() => setIsLearned(false)}
                  className="sr-only"
                />
                <span className="vsc-icon">○</span>
                <div className="vsc-info">
                  <span className="vsc-title">Chưa học</span>
                  <span className="vsc-desc">Chỉ lưu vào danh sách, chưa đưa vào lịch ôn tập.</span>
                </div>
                <span className="tc-check">{!isLearned ? '✓' : ''}</span>
              </label>

              <label className={`vocab-status-card ${isLearned ? 'selected-learned' : ''}`}>
                <input
                  type="radio"
                  name="vocab-learning-status"
                  checked={isLearned}
                  onChange={() => setIsLearned(true)}
                  className="sr-only"
                />
                <span className="vsc-icon">✓</span>
                <div className="vsc-info">
                  <span className="vsc-title">Đã học</span>
                  <span className="vsc-desc">Tôi đã học từ này và muốn đưa vào lịch ôn tập.</span>
                </div>
                <span className="tc-check">{isLearned ? '✓' : ''}</span>
              </label>
            </div>
          </fieldset>

          {/* Section 3: Examples */}
          <div className="form-section-title">💬 Câu ví dụ</div>
          <div className="form-group">
            <label className="mochi-label">Câu ví dụ (Tiếng Trung)</label>
            <input
              type="text"
              className="mochi-input hanzi-input"
              placeholder="你好，我是学生。"
              value={exCn}
              onChange={e => setExCn(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Pinyin câu ví dụ</label>
              <input
                type="text"
                className="mochi-input"
                placeholder="Nǐ hǎo, wǒ shì xuéshēng."
                value={exPinyin}
                onChange={e => setExPinyin(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="mochi-label">Dịch nghĩa câu ví dụ</label>
              <input
                type="text"
                className="mochi-input"
                placeholder="Xin chào, tôi là học sinh."
                value={exVi}
                onChange={e => setExVi(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Notes */}
          <div className="form-section-title">📝 Ghi chú</div>
          <div className="form-group">
            <textarea
              className="mochi-input"
              placeholder="Ghi chú về mẹo nhớ, thành phần bộ thủ..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Form Actions */}
          <div className="inline-form-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : existing ? 'Cập nhật từ vựng' : 'Lưu từ vựng'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .hanzi-input { font-size: 1.15rem; font-weight: 700; }
        .field-error-msg { font-size: 0.75rem; color: var(--peach-500); font-weight: 700; margin-top: 2px; }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </div>
  )
}

function VocabPageContent() {
  const searchParams = useSearchParams()
  const { user, profile } = useUser()
  const [vocab, setVocab] = useState<HskVocabulary[]>([])
  const [lessons, setLessons] = useState<HskLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add')
  const [editing, setEditing] = useState<HskVocabulary | undefined>()
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterLesson, setFilterLesson] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'not_learned' | 'learning' | 'learned' | 'mastered' | 'due'>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [togglingLearnedId, setTogglingLearnedId] = useState<string | null>(null)

  const activeCourseId = profile?.active_hsk_course_id ?? undefined

  useEffect(() => {
    if (user) loadData()
  }, [user, activeCourseId])

  useDataChanged('chinese', loadData)

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    // Query active course lessons and vocab
    let vocabQuery = activeCourseId
      ? supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id).eq('course_id', activeCourseId).order('created_at', { ascending: false })
      : supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

    let lessonQuery = activeCourseId
      ? supabase.from('hsk_lessons').select('*').eq('user_id', user.id).eq('course_id', activeCourseId).order('lesson_number')
      : supabase.from('hsk_lessons').select('*').eq('user_id', user.id).order('lesson_number')

    let [vocabRes, lessonRes] = await Promise.all([
      vocabQuery,
      lessonQuery,
    ])

    if (vocabRes.error && vocabRes.error.message.includes('course_id')) {
      vocabRes = await supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    }

    setVocab(vocabRes.data ?? [])
    setLessons(lessonRes.data ?? [])
    setLoading(false)
  }

  async function toggleFavorite(v: HskVocabulary) {
    const supabase = createClient()
    const nextFav = !v.is_favorite
    setVocab(prev => prev.map(x => x.id === v.id ? { ...x, is_favorite: nextFav } : x))
    const { error } = await supabase.from('hsk_vocabulary').update({ is_favorite: nextFav }).eq('id', v.id)
    if (error) {
      toast.error('Không thể cập nhật yêu thích')
      setVocab(prev => prev.map(x => x.id === v.id ? { ...x, is_favorite: v.is_favorite } : x))
    }
  }

  async function toggleQuickLearned(v: HskVocabulary) {
    if (togglingLearnedId === v.id) return
    setTogglingLearnedId(v.id)

    const isCurrentlyLearned = v.memory_level !== 'not_learned'
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const nextLevel: MemoryLevel = isCurrentlyLearned ? 'not_learned' : 'learned'
    const nextFirstLearned = isCurrentlyLearned ? v.first_learned_at : (v.first_learned_at ?? now.toISOString())
    const nextReviewAt = isCurrentlyLearned ? v.next_review_at : tomorrow.toISOString()
    const nextInterval = isCurrentlyLearned ? v.sr_interval_days : 1
    const nextReps = isCurrentlyLearned ? v.sr_repetitions : 1

    // Optimistic update
    setVocab(prev => prev.map(x => x.id === v.id ? {
      ...x,
      memory_level: nextLevel,
      first_learned_at: nextFirstLearned,
      next_review_at: nextReviewAt,
      sr_interval_days: nextInterval,
      sr_repetitions: nextReps,
    } : x))

    const supabase = createClient()
    const { error } = await supabase.from('hsk_vocabulary').update({
      memory_level: nextLevel,
      first_learned_at: nextFirstLearned,
      next_review_at: nextReviewAt,
      sr_interval_days: nextInterval,
      sr_repetitions: nextReps,
    }).eq('id', v.id)

    setTogglingLearnedId(null)

    if (error) {
      // Rollback
      toast.error('Cập nhật thất bại: ' + error.message)
      setVocab(prev => prev.map(x => x.id === v.id ? v : x))
      return
    }

    if (!isCurrentlyLearned) {
      toast.success(`Đã đánh dấu "${v.hanzi}" là đã học! 🎉`)
    } else {
      toast.info(`Đã chuyển "${v.hanzi}" về Chưa học`)
    }
    notifyDataChanged('chinese', 'vocabulary', v.course_id ?? activeCourseId)
  }

  async function deleteVocab(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa từ vựng này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('hsk_vocabulary').delete().eq('id', id)
    if (error) {
      toast.error('Không thể xóa từ vựng: ' + error.message)
      return
    }
    toast.success('Đã xóa từ vựng')
    notifyDataChanged('chinese', 'vocabulary')
    loadData()
  }

  function exportCSV() {
    const header = 'Hán tự,Pinyin,Nghĩa,Loại từ,Trạng thái học,Mức độ nhớ,Số lần đúng,Số lần sai'
    const rows = filteredVocab.map(v =>
      `"${v.hanzi}","${v.pinyin}","${v.meaning}","${v.word_type ?? ''}","${v.memory_level !== 'not_learned' ? 'Đã học' : 'Chưa học'}","${MEMORY_LEVEL_LABELS[v.memory_level]?.label ?? ''}",${v.correct_count},${v.incorrect_count}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tu-vung.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất dữ liệu CSV!')
  }

  const now = new Date()
  const totalCount = vocab.length
  const learnedCount = vocab.filter(v => v.memory_level !== 'not_learned').length
  const notLearnedCount = vocab.filter(v => v.memory_level === 'not_learned').length
  const dueVocab = vocab.filter(v => v.memory_level !== 'not_learned' && new Date(v.next_review_at) <= now)

  let filtered = vocab
  if (activeTab === 'not_learned') filtered = filtered.filter(v => v.memory_level === 'not_learned')
  else if (activeTab === 'learning') filtered = filtered.filter(v => v.memory_level === 'learning' || v.memory_level === 'hard')
  else if (activeTab === 'learned') filtered = filtered.filter(v => v.memory_level === 'learned')
  else if (activeTab === 'mastered') filtered = filtered.filter(v => v.memory_level === 'mastered')
  else if (activeTab === 'due') filtered = dueVocab

  if (showFavorites) filtered = filtered.filter(v => v.is_favorite)
  if (filterLevel) filtered = filtered.filter(v => v.memory_level === filterLevel)
  if (filterLesson) filtered = filtered.filter(v => v.lesson_id === filterLesson)
  if (search) filtered = filtered.filter(v =>
    v.hanzi.includes(search) ||
    v.pinyin.toLowerCase().includes(search.toLowerCase()) ||
    v.meaning.toLowerCase().includes(search.toLowerCase())
  )
  const filteredVocab = filtered
  const isFormOpen = showForm || !!editing

  return (
    <div className="page">
      {/* 1. Header & Primary Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🔤 Từ vựng tiếng Trung</h1>
          <p className="page-subtitle">
            Tổng: {totalCount} từ · Đã học: {learnedCount} · Chưa học: {notLearnedCount} · Cần ôn: {dueVocab.length}
          </p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 CSV</button>
          <Link href="/chinese/vocabulary/flashcard" className="mochi-btn mochi-btn-secondary mochi-btn-sm">🃏 Flashcard</Link>
          <Link href="/chinese/vocabulary/quiz" className="mochi-btn mochi-btn-secondary mochi-btn-sm">❓ Quiz</Link>
          {!isFormOpen && (
            <button onClick={() => { setEditing(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs & View Controls */}
      <div className="controls-row">
        <div className="view-toggle">
          <button className={`view-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả ({totalCount})</button>
          <button className={`view-btn ${activeTab === 'not_learned' ? 'active' : ''}`} onClick={() => setActiveTab('not_learned')}>Chưa học ({notLearnedCount})</button>
          <button className={`view-btn ${activeTab === 'learning' ? 'active' : ''}`} onClick={() => setActiveTab('learning')}>Đang học</button>
          <button className={`view-btn ${activeTab === 'learned' ? 'active' : ''}`} onClick={() => setActiveTab('learned')}>Đã học ({learnedCount})</button>
          <button className={`view-btn ${activeTab === 'mastered' ? 'active' : ''}`} onClick={() => setActiveTab('mastered')}>Thành thạo</button>
          <button className={`view-btn ${activeTab === 'due' ? 'active due-mode' : ''}`} onClick={() => setActiveTab('due')}>Cần ôn ({dueVocab.length})</button>
        </div>
        <button
          className={`fav-btn ${showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(!showFavorites)}
        >
          {showFavorites ? '❤️' : '🤍'} Yêu thích
        </button>
      </div>

      {/* 3. Search & Select Filters */}
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
          {lessons.map(l => <option key={l.id} value={l.id}>Bài {l.lesson_number}: {l.title}</option>)}
        </select>
      </div>

      {/* 4. Inline Form when Open */}
      {isFormOpen && (
        <VocabForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSaved={loadData}
          lessons={lessons}
          activeCourseId={activeCourseId}
          existing={editing}
        />
      )}

      {/* 5. Vocabulary List & Empty State (ONLY when form is CLOSED) */}
      {!isFormOpen && (
        <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 16 }} />)}
            </div>
          ) : filteredVocab.length === 0 ? (
            <div className="mochi-empty-state">
              <div className="mascot">😸</div>
              <h3>{activeTab === 'due' ? 'Không có từ nào cần ôn hôm nay!' : 'Chưa có từ vựng nào'}</h3>
              <p>{activeTab === 'due' ? 'Tuyệt vời! Bạn đã hoàn thành các từ cần ôn 🎉' : 'Hãy bắt đầu thêm những từ vựng đầu tiên nhé!'}</p>
              {activeTab !== 'due' && (
                <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm từ vựng</button>
              )}
            </div>
          ) : (
            <div className="vocab-list">
              {filteredVocab.map(v => {
                const isLearned = v.memory_level !== 'not_learned'
                const isDue = isLearned && new Date(v.next_review_at) <= now
                return (
                  <div key={v.id} className={`vocab-item ${isDue ? 'due' : ''}`}>
                    <div className="vocab-hanzi">{v.hanzi}</div>
                    <div className="vocab-info">
                      <div className="vocab-pinyin">{v.pinyin}</div>
                      <div className="vocab-meaning">{v.meaning}</div>
                      {v.word_type && <span className="word-type-badge">{WORD_TYPE_LABELS[v.word_type] ?? v.word_type}</span>}
                    </div>

                    <div className="vocab-meta">
                      {/* Quick "Đã học" Toggle Button */}
                      <button
                        type="button"
                        className={`vocab-quick-learned-btn ${isLearned ? 'is-learned' : ''}`}
                        onClick={() => toggleQuickLearned(v)}
                        disabled={togglingLearnedId === v.id}
                        title={isLearned ? 'Đã đánh dấu học' : 'Bấm để đánh dấu đã học'}
                      >
                        {togglingLearnedId === v.id ? '...' : isLearned ? '✓ Đã học' : '○ Chưa học'}
                      </button>

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
                      <button onClick={() => toggleFavorite(v)} className="fav-icon-btn" title="Yêu thích">{v.is_favorite ? '❤️' : '🤍'}</button>
                      <button onClick={() => { setEditing(v); setShowForm(true) }} className="icon-btn" title="Sửa">✏️</button>
                      <button onClick={() => deleteVocab(v.id)} className="icon-btn" title="Xóa">🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .controls-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .view-toggle { display: flex; background: var(--cream); border-radius: 999px; padding: 3px; flex-wrap: wrap; gap: 2px; }
        .view-btn { padding: 5px 12px; border-radius: 999px; border: none; background: transparent; color: var(--chocolate-400); font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .view-btn.active { background: white; color: var(--chocolate-600); box-shadow: var(--shadow-xs); }
        .view-btn.due-mode { color: var(--lavender-400); }
        .fav-btn { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .fav-btn.active { background: var(--peach-100); border-color: var(--peach-400); }
        .filters-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 200px; }
        .vocab-list { display: flex; flex-direction: column; gap: 8px; }
        .vocab-item { background: white; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); transition: all 0.15s; }
        .vocab-item.due { border-left: 4px solid var(--lavender-400); }
        .vocab-hanzi { font-size: 1.6rem; font-weight: 800; color: var(--chocolate-700); min-width: 52px; text-align: center; line-height: 1; }
        .vocab-info { flex: 1; min-width: 0; }
        .vocab-pinyin { font-size: 0.85rem; font-weight: 600; color: var(--lavender-400); font-style: italic; }
        .vocab-meaning { font-size: 0.92rem; font-weight: 700; color: var(--chocolate-600); }
        .word-type-badge { display: inline-block; font-size: 0.65rem; background: var(--cheese-100); color: var(--chocolate-500); padding: 1px 7px; border-radius: 999px; font-weight: 700; margin-top: 3px; }
        .vocab-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .memory-badge { font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
        .vocab-stats { display: flex; gap: 6px; font-size: 0.72rem; font-weight: 700; }
        .stat-good { color: var(--mint-400); }
        .stat-bad { color: var(--peach-400); }
        .vocab-actions { display: flex; gap: 2px; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.95rem; padding: 4px 5px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .fav-icon-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px 5px; }
        @media (max-width: 640px) {
          .vocab-item { flex-wrap: wrap; }
          .header-actions { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

export default function VocabPage() {
  return <Suspense><VocabPageContent /></Suspense>
}
