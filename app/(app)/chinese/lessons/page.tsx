'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatDate, todayString } from '@/lib/date-utils'
import type { HskLesson, HskCourse } from '@/lib/types'
import { LESSON_STATUS_LABELS } from '@/lib/format'

const STATUS_COLORS = {
  not_started: '#D9C4A8',
  in_progress: '#FFCA1A',
  completed: '#3BB88E',
  needs_review: '#FF7A5C',
  mastered: '#8F71F5',
}

function LessonForm({ onClose, onSaved, courses, existing }: {
  onClose: () => void
  onSaved: () => void
  courses: HskCourse[]
  existing?: HskLesson
}) {
  const { user } = useUser()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [lessonNum, setLessonNum] = useState(existing?.lesson_number?.toString() ?? '')
  const [courseId, setCourseId] = useState(existing?.course_id ?? courses[0]?.id ?? '')
  const [chapter, setChapter] = useState(existing?.chapter ?? '')
  const [topic, setTopic] = useState(existing?.topic ?? '')
  const [status, setStatus] = useState(existing?.status ?? 'not_started')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !lessonNum) { toast.error('Vui lòng nhập tiêu đề và số bài'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      course_id: courseId || null,
      lesson_number: Number(lessonNum),
      title,
      chapter: chapter || null,
      topic: topic || null,
      status,
      note: note || null,
      start_date: status !== 'not_started' ? (existing?.start_date ?? todayString()) : null,
      completion_date: (status === 'completed' || status === 'mastered') ? (existing?.completion_date ?? todayString()) : null,
    }
    const { error } = existing
      ? await supabase.from('hsk_lessons').update(payload).eq('id', existing.id)
      : await supabase.from('hsk_lessons').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật bài học!' : 'Đã thêm bài học mới! 🎉')
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa bài học' : 'Thêm bài học'} 📚</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Số bài *</label>
              <input type="number" className="mochi-input" placeholder="1" value={lessonNum} onChange={e => setLessonNum(e.target.value)} min="1" required />
            </div>
            <div className="form-group">
              <label className="mochi-label">Khóa học</label>
              <select className="mochi-input" value={courseId} onChange={e => setCourseId(e.target.value)}>
                <option value="">-- Không thuộc khóa nào --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Tiêu đề bài học *</label>
            <input type="text" className="mochi-input" placeholder="Bài 1: Chào hỏi" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Chương</label>
              <input type="text" className="mochi-input" placeholder="Chương 1" value={chapter} onChange={e => setChapter(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="mochi-label">Chủ đề</label>
              <input type="text" className="mochi-input" placeholder="Giới thiệu bản thân" value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="mochi-label">Trạng thái</label>
            <div className="status-grid">
              {Object.entries(LESSON_STATUS_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  className={`status-btn ${status === key ? 'selected' : ''}`}
                  style={status === key ? { background: `${STATUS_COLORS[key as keyof typeof STATUS_COLORS]}20`, borderColor: STATUS_COLORS[key as keyof typeof STATUS_COLORS], color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] } : {}}
                  onClick={() => setStatus(key as any)}
                >
                  {info.label}
                </button>
              ))}
            </div>
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

export default function LessonsPage() {
  const { user } = useUser()
  const [lessons, setLessons] = useState<HskLesson[]>([])
  const [courses, setCourses] = useState<HskCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<HskLesson | undefined>()
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const [lessonsRes, coursesRes] = await Promise.all([
      supabase.from('hsk_lessons').select('*').eq('user_id', user.id).order('lesson_number'),
      supabase.from('hsk_courses').select('*').eq('user_id', user.id),
    ])
    setLessons(lessonsRes.data ?? [])
    setCourses(coursesRes.data ?? [])
    setLoading(false)
  }

  async function updateStatus(lesson: HskLesson, newStatus: string) {
    const supabase = createClient()
    const updates: Partial<HskLesson> = { status: newStatus as any }
    if (newStatus === 'in_progress' && !lesson.start_date) updates.start_date = todayString()
    if ((newStatus === 'completed' || newStatus === 'mastered') && !lesson.completion_date) updates.completion_date = todayString()
    await supabase.from('hsk_lessons').update(updates).eq('id', lesson.id)
    toast.success('Đã cập nhật trạng thái!')
    loadData()
  }

  async function deleteLesson(id: string) {
    if (!confirm('Xóa bài học này?')) return
    const supabase = createClient()
    await supabase.from('hsk_lessons').delete().eq('id', id)
    toast.success('Đã xóa')
    loadData()
  }

  const filteredLessons = lessons.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.topic?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusCounts = lessons.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const completedCount = (statusCounts['completed'] ?? 0) + (statusCounts['mastered'] ?? 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📚 Bài học tiếng Trung</h1>
          <p className="page-subtitle">{completedCount}/{lessons.length} bài đã hoàn thành</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">
          + Thêm bài học
        </button>
      </div>

      {/* Status summary */}
      <div className="status-summary">
        <button className={`status-filter-btn ${filterStatus === '' ? 'active' : ''}`} onClick={() => setFilterStatus('')}>
          Tất cả ({lessons.length})
        </button>
        {Object.entries(LESSON_STATUS_LABELS).map(([key, info]) => (
          <button
            key={key}
            className={`status-filter-btn ${filterStatus === key ? 'active' : ''}`}
            style={filterStatus === key ? { background: `${STATUS_COLORS[key as keyof typeof STATUS_COLORS]}20`, borderColor: STATUS_COLORS[key as keyof typeof STATUS_COLORS], color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] } : {}}
            onClick={() => setFilterStatus(key)}
          >
            {info.label} ({statusCounts[key] ?? 0})
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input
          type="text"
          className="mochi-input search-input"
          placeholder="🔍 Tìm bài học..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 18 }} />)}
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">😸</div>
          <h3>Chưa có bài học nào</h3>
          <p>Thêm bài học đầu tiên để bắt đầu hành trình học tiếng Trung!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm bài học</button>
        </div>
      ) : (
        <div className="lessons-list">
          {filteredLessons.map(lesson => {
            const statusInfo = LESSON_STATUS_LABELS[lesson.status]
            const statusColor = STATUS_COLORS[lesson.status as keyof typeof STATUS_COLORS]
            return (
              <div key={lesson.id} className="lesson-item">
                <div className="lesson-num">B{lesson.lesson_number}</div>
                <div className="lesson-info">
                  <div className="lesson-title">{lesson.title}</div>
                  <div className="lesson-meta">
                    {lesson.topic && <span>{lesson.topic}</span>}
                    {lesson.start_date && <span>Bắt đầu: {formatDate(lesson.start_date)}</span>}
                    {lesson.completion_date && <span>Hoàn thành: {formatDate(lesson.completion_date)}</span>}
                  </div>
                </div>
                <div className="lesson-status">
                  <select
                    className="status-select"
                    value={lesson.status}
                    onChange={e => updateStatus(lesson, e.target.value)}
                    style={{ borderColor: statusColor, color: statusColor }}
                  >
                    {Object.entries(LESSON_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="lesson-actions">
                  <button className="icon-btn" onClick={() => { setEditing(lesson); setShowForm(true) }}>✏️</button>
                  <button className="icon-btn" onClick={() => deleteLesson(lesson.id)}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <LessonForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSaved={loadData}
          courses={courses}
          existing={editing}
        />
      )}

      <style jsx>{`
        .page { max-width: 800px; margin: 0 auto; padding-bottom: 32px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .status-summary { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .status-filter-btn { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .status-filter-btn.active { background: var(--cream); border-color: var(--chocolate-300); }
        .filters-row { margin-bottom: 16px; }
        .search-input { max-width: 100%; }
        .lessons-list { display: flex; flex-direction: column; gap: 8px; }
        .lesson-item { background: white; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); }
        .lesson-num { width: 36px; height: 36px; border-radius: 12px; background: var(--lavender-100); color: var(--lavender-500); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.78rem; flex-shrink: 0; }
        .lesson-info { flex: 1; min-width: 0; }
        .lesson-title { font-weight: 700; font-size: 0.9rem; color: var(--chocolate-600); margin-bottom: 3px; }
        .lesson-meta { display: flex; gap: 10px; font-size: 0.72rem; color: var(--chocolate-400); font-weight: 600; flex-wrap: wrap; }
        .lesson-status { flex-shrink: 0; }
        .status-select { padding: 4px 10px; border-radius: 999px; border: 1.5px solid; background: white; font-weight: 700; font-size: 0.75rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .lesson-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px 5px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 520px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .status-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .status-btn { padding: 6px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } .lesson-item { flex-wrap: wrap; } }
      `}</style>
    </div>
  )
}
