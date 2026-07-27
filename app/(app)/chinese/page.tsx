'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { formatDate, todayString } from '@/lib/date-utils'
import { MEMORY_LEVEL_LABELS, LESSON_STATUS_LABELS } from '@/lib/format'
import type { HskCourse, HskLesson, HskVocabulary, StudySession, StudyGoal } from '@/lib/types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MEMORY_COLORS = {
  not_learned: '#D9C4A8',
  hard: '#FF7A5C',
  learning: '#FFCA1A',
  learned: '#3BB88E',
  mastered: '#8F71F5',
}

function ProgressRing({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const r = size / 2 - 6
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0E6D8" strokeWidth={5} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

export default function ChinesePage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<HskCourse[]>([])
  const [lessons, setLessons] = useState<HskLesson[]>([])
  const [vocabulary, setVocabulary] = useState<HskVocabulary[]>([])
  const [todaySession, setTodaySession] = useState<StudySession | null>(null)
  const [studyGoal, setStudyGoal] = useState<StudyGoal | null>(null)
  const [streak, setStreak] = useState(0)

  const today = todayString()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    const [coursesRes, lessonsRes, vocabRes, todayRes, goalRes] = await Promise.all([
      supabase.from('hsk_courses').select('*').eq('user_id', user.id),
      supabase.from('hsk_lessons').select('*').eq('user_id', user.id).order('lesson_number'),
      supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).eq('session_date', today).single(),
      supabase.from('study_goals').select('*').eq('user_id', user.id).single(),
    ])

    setCourses(coursesRes.data ?? [])
    setLessons(lessonsRes.data ?? [])
    setVocabulary(vocabRes.data ?? [])
    setTodaySession(todayRes.data)
    setStudyGoal(goalRes.data)

    // Calculate streak
    const { data: sessions } = await supabase.from('study_sessions').select('session_date').eq('user_id', user.id).order('session_date', { ascending: false }).limit(60)
    if (sessions) {
      let s = 0
      const dateSet = new Set(sessions.map(x => x.session_date))
      const d = new Date()
      while (true) {
        const ds = d.toISOString().split('T')[0]
        if (dateSet.has(ds)) { s++; d.setDate(d.getDate() - 1) } else break
      }
      setStreak(s)
    }

    setLoading(false)
  }

  const dueVocab = vocabulary.filter(v => new Date(v.next_review_at) <= new Date())
  const masteredVocab = vocabulary.filter(v => v.memory_level === 'mastered')
  const completedLessons = lessons.filter(l => l.status === 'completed' || l.status === 'mastered')
  const inProgressLesson = lessons.find(l => l.status === 'in_progress')

  const HSK3_TOTAL = 300
  const hskProgress = Math.min(100, Math.round((vocabulary.length / HSK3_TOTAL) * 100))

  // Memory level distribution
  const memoryDist = Object.entries(
    vocabulary.reduce((acc, v) => ({ ...acc, [v.memory_level]: (acc[v.memory_level] ?? 0) + 1 }), {} as Record<string, number>)
  ).map(([level, count]) => ({
    name: MEMORY_LEVEL_LABELS[level as keyof typeof MEMORY_LEVEL_LABELS]?.label ?? level,
    value: count,
    color: MEMORY_COLORS[level as keyof typeof MEMORY_COLORS] ?? '#B8997A',
  }))

  const todayWords = todaySession?.new_words_count ?? 0
  const todayReview = todaySession?.reviewed_words_count ?? 0
  const todayMinutes = todaySession?.duration_minutes ?? 0

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' }}>
        {[1,2,3].map(i => <div key={i} className="mochi-skeleton" style={{ height: 160, borderRadius: 24 }} />)}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🈶 Học tiếng Trung HSK 3</h1>
          <p className="page-subtitle">Tiến độ học tập của bạn</p>
        </div>
        <div className="header-actions">
          <Link href="/chinese/vocabulary?action=add" className="mochi-btn mochi-btn-secondary mochi-btn-sm">+ Từ vựng</Link>
          <Link href="/chinese/review" className={`mochi-btn mochi-btn-primary mochi-btn-sm ${dueVocab.length > 0 ? 'pulse' : ''}`}>
            ôn tập {dueVocab.length > 0 ? `(${dueVocab.length})` : ''}
          </Link>
        </div>
      </div>

      {/* Hero progress card */}
      <div className="hero-card">
        <div className="hero-left">
          <div className="hsk-badge">HSK 3</div>
          <h2 className="hero-title">
            {vocabulary.length}/{HSK3_TOTAL} từ vựng
          </h2>
          <p className="hero-sub">{completedLessons.length}/{lessons.length} bài đã hoàn thành</p>

          <div className="hero-streak">
            <span className="streak-fire">🔥</span>
            <span className="streak-count">{streak}</span>
            <span className="streak-label">ngày liên tục</span>
          </div>

          <div className="mochi-progress" style={{ marginTop: 12 }}>
            <div className="mochi-progress-bar study" style={{ width: `${hskProgress}%` }} />
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--lavender-500)', marginTop: 4 }}>
            {hskProgress}% hoàn thành chương trình
          </div>
        </div>

        <div className="hero-ring">
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing value={vocabulary.length} max={HSK3_TOTAL} color="#8F71F5" size={120} />
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--chocolate-600)' }}>{hskProgress}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today stats */}
      <div className="today-stats">
        <div className="today-stat">
          <div className="ts-emoji">📖</div>
          <div className="ts-value">{todayWords}</div>
          <div className="ts-label">từ mới hôm nay</div>
          {studyGoal && <div className="ts-goal">Mục tiêu: {studyGoal.daily_new_words}</div>}
        </div>
        <div className="today-stat">
          <div className="ts-emoji">🔄</div>
          <div className="ts-value">{todayReview}</div>
          <div className="ts-label">từ đã ôn</div>
        </div>
        <div className="today-stat">
          <div className="ts-emoji">⏱️</div>
          <div className="ts-value">{todayMinutes}</div>
          <div className="ts-label">phút học</div>
          {studyGoal && <div className="ts-goal">Mục tiêu: {studyGoal.daily_minutes}'</div>}
        </div>
        <div className="today-stat">
          <div className="ts-emoji">⚡</div>
          <div className="ts-value">{dueVocab.length}</div>
          <div className="ts-label">từ cần ôn</div>
        </div>
      </div>

      {/* Current lesson */}
      {inProgressLesson && (
        <div className="current-lesson-card">
          <div className="cl-label">📚 Đang học</div>
          <div className="cl-title">{inProgressLesson.title}</div>
          <div className="cl-meta">Bài {inProgressLesson.lesson_number} · {inProgressLesson.progress_percent}% hoàn thành</div>
          <div className="mochi-progress" style={{ marginTop: 8 }}>
            <div className="mochi-progress-bar study" style={{ width: `${inProgressLesson.progress_percent}%` }} />
          </div>
          <Link href={`/chinese/lessons/${inProgressLesson.id}`} className="mochi-btn mochi-btn-primary mochi-btn-sm" style={{ marginTop: 12, alignSelf: 'flex-start' }}>
            Tiếp tục học →
          </Link>
        </div>
      )}

      {/* Nav cards */}
      <div className="nav-cards">
        <Link href="/chinese/lessons" className="nav-card">
          <span className="nc-emoji">📚</span>
          <span className="nc-title">Bài học</span>
          <span className="nc-count">{lessons.length} bài</span>
        </Link>
        <Link href="/chinese/vocabulary" className="nav-card">
          <span className="nc-emoji">🔤</span>
          <span className="nc-title">Từ vựng</span>
          <span className="nc-count">{vocabulary.length} từ</span>
        </Link>
        <Link href="/chinese/vocabulary/flashcard" className="nav-card">
          <span className="nc-emoji">🃏</span>
          <span className="nc-title">Flashcard</span>
          <span className="nc-count">Ôn tập</span>
        </Link>
        <Link href="/chinese/vocabulary/quiz" className="nav-card">
          <span className="nc-emoji">❓</span>
          <span className="nc-title">Quiz</span>
          <span className="nc-count">Kiểm tra</span>
        </Link>
        <Link href="/chinese/grammar" className="nav-card">
          <span className="nc-emoji">✍️</span>
          <span className="nc-title">Ngữ pháp</span>
          <span className="nc-count">Cấu trúc</span>
        </Link>
        <Link href="/chinese/journal" className="nav-card">
          <span className="nc-emoji">📝</span>
          <span className="nc-title">Nhật ký</span>
          <span className="nc-count">Ghi nhận</span>
        </Link>
        <Link href="/chinese/review" className={`nav-card ${dueVocab.length > 0 ? 'highlight' : ''}`}>
          <span className="nc-emoji">🔄</span>
          <span className="nc-title">Ôn tập SRS</span>
          <span className="nc-count">{dueVocab.length} từ cần ôn</span>
        </Link>
        <Link href="/chinese/import" className="nav-card">
          <span className="nc-emoji">📥</span>
          <span className="nc-title">Import dữ liệu</span>
          <span className="nc-count">Quản lý nguồn</span>
        </Link>
      </div>

      {/* Memory distribution */}
      {vocabulary.length > 0 && (
        <div className="mochi-card" style={{ padding: 20 }}>
          <h3 className="card-title">Trạng thái từ vựng</h3>
          <div className="memory-dist">
            {Object.entries(MEMORY_LEVEL_LABELS).map(([level, info]) => {
              const count = vocabulary.filter(v => v.memory_level === level).length
              const pct = Math.round((count / vocabulary.length) * 100)
              return (
                <div key={level} className="memory-item">
                  <div className="memory-bar-wrap">
                    <div className="memory-bar" style={{ height: `${pct}%`, background: MEMORY_COLORS[level as keyof typeof MEMORY_COLORS] }} />
                  </div>
                  <div className="memory-count">{count}</div>
                  <div className="memory-label">{info.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .pulse { animation: mochi-sparkle 2s ease-in-out infinite; }
        .hero-card { background: linear-gradient(135deg, #F5F2FF 0%, #E8E0FF 100%); border-radius: 24px; padding: 24px; display: flex; align-items: center; justify-content: space-between; border: 1.5px solid var(--lavender-200); }
        .hero-left { flex: 1; }
        .hsk-badge { display: inline-block; background: var(--lavender-400); color: white; padding: 3px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; margin-bottom: 8px; }
        .hero-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .hero-sub { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0 0 12px; }
        .hero-streak { display: flex; align-items: center; gap: 6px; }
        .streak-fire { font-size: 1.3rem; }
        .streak-count { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); }
        .streak-label { font-size: 0.85rem; color: var(--chocolate-400); font-weight: 600; }
        .hero-ring { flex-shrink: 0; margin-left: 16px; }
        .today-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .today-stat { background: white; border-radius: 18px; padding: 14px; text-align: center; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); }
        .ts-emoji { font-size: 1.3rem; margin-bottom: 4px; }
        .ts-value { font-size: 1.3rem; font-weight: 800; color: var(--chocolate-600); }
        .ts-label { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-top: 2px; }
        .ts-goal { font-size: 0.7rem; color: var(--chocolate-300); font-weight: 600; margin-top: 2px; }
        .current-lesson-card { background: white; border-radius: 20px; padding: 20px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--lavender-200); display: flex; flex-direction: column; border-left: 4px solid var(--lavender-400); }
        .cl-label { font-size: 0.75rem; font-weight: 700; color: var(--lavender-400); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .cl-title { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); margin-bottom: 4px; }
        .cl-meta { font-size: 0.82rem; color: var(--chocolate-400); font-weight: 600; }
        .nav-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .nav-card { background: white; border-radius: 18px; padding: 16px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.15s; text-align: center; }
        .nav-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .nav-card.highlight { border-color: var(--lavender-400); background: var(--lavender-50); }
        .nc-emoji { font-size: 1.5rem; }
        .nc-title { font-size: 0.78rem; font-weight: 700; color: var(--chocolate-600); }
        .nc-count { font-size: 0.7rem; font-weight: 600; color: var(--chocolate-400); }
        .card-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .memory-dist { display: flex; align-items: flex-end; justify-content: center; gap: 16px; height: 100px; }
        .memory-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
        .memory-bar-wrap { height: 60px; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
        .memory-bar { width: 70%; border-radius: 6px 6px 0 0; min-height: 4px; transition: height 1s ease; }
        .memory-count { font-size: 0.78rem; font-weight: 800; color: var(--chocolate-600); }
        .memory-label { font-size: 0.65rem; font-weight: 700; color: var(--chocolate-400); text-align: center; }
        @media (max-width: 768px) {
          .nav-cards { grid-template-columns: repeat(2, 1fr); }
          .today-stats { grid-template-columns: repeat(2, 1fr); }
          .hero-ring { display: none; }
        }
        @media (max-width: 480px) {
          .hero-card { flex-direction: column; }
          .nav-cards { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}
