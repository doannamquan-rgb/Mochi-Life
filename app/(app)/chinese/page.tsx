'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { todayString } from '@/lib/date-utils'
import { MEMORY_LEVEL_LABELS, LESSON_STATUS_LABELS } from '@/lib/format'
import type { HskCourse, HskLesson, HskVocabulary, StudySession, StudyGoal } from '@/lib/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'

const MEMORY_COLORS = {
  not_learned: '#D9C4A8',
  hard: '#FF7A5C',
  learning: '#FFCA1A',
  learned: '#3BB88E',
  mastered: '#8F71F5',
}

function ProgressRing({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
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
  const { user, profile } = useUser()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<HskCourse[]>([])
  const [activeCourse, setActiveCourse] = useState<HskCourse | null>(null)
  const [lessons, setLessons] = useState<HskLesson[]>([])
  const [vocabulary, setVocabulary] = useState<HskVocabulary[]>([])
  const [todaySession, setTodaySession] = useState<StudySession | null>(null)
  const [studyGoal, setStudyGoal] = useState<StudyGoal | null>(null)
  const [streak, setStreak] = useState(0)

  const today = todayString()

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, profile?.active_hsk_course_id])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    // 1. Fetch all user courses
    const { data: userCourses } = await supabase.from('hsk_courses').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    const allCourses: HskCourse[] = userCourses ?? []
    setCourses(allCourses)

    let currentActive: HskCourse | null = null
    if (profile?.active_hsk_course_id) {
      currentActive = allCourses.find(c => c.id === profile.active_hsk_course_id) ?? null
    }
    if (!currentActive && allCourses.length > 0) {
      currentActive = allCourses[0]
    }
    setActiveCourse(currentActive)

    if (currentActive) {
      const [lessonsRes, vocabRes, todayRes, goalRes] = await Promise.all([
        supabase.from('hsk_lessons').select('*').eq('course_id', currentActive.id).order('lesson_number'),
        supabase.from('hsk_vocabulary').select('*').eq('course_id', currentActive.id),
        supabase.from('study_sessions').select('*').eq('user_id', user.id).eq('session_date', today).maybeSingle(),
        supabase.from('study_goals').select('*').eq('user_id', user.id).maybeSingle(),
      ])

      setLessons(lessonsRes.data ?? [])
      setVocabulary(vocabRes.data ?? [])
      setTodaySession(todayRes.data)
      setStudyGoal(goalRes.data)
    } else {
      setLessons([])
      setVocabulary([])
    }

    // Calculate streak
    const { data: sessions } = await supabase.from('study_sessions').select('session_date').eq('user_id', user.id).order('session_date', { ascending: false }).limit(60)
    if (sessions) {
      let s = 0
      const dateSet = new Set((sessions as Array<{ session_date: string }>).map(x => x.session_date))
      const d = new Date()
      while (true) {
        const ds = d.toISOString().split('T')[0]
        if (dateSet.has(ds)) { s++; d.setDate(d.getDate() - 1) } else break
      }
      setStreak(s)
    }

    setLoading(false)
  }

  async function handleSwitchCourse(courseId: string) {
    if (!user) return
    const supabase = createClient()
    await supabase.from('user_profiles').update({ active_hsk_course_id: courseId }).eq('user_id', user.id)
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      setActiveCourse(selected)
      toast.success(`Đã chuyển sang khóa học: ${selected.name}`)
      loadData()
    }
  }

  const totalVocabTarget = activeCourse?.total_vocabulary || (vocabulary.length > 0 ? vocabulary.length : 1)
  const dueVocab = vocabulary.filter(v => new Date(v.next_review_at) <= new Date())
  const masteredVocab = vocabulary.filter(v => v.memory_level === 'mastered')
  const completedLessons = lessons.filter(l => l.status === 'completed' || l.status === 'mastered')
  const inProgressLesson = lessons.find(l => l.status === 'in_progress')

  const courseProgress = totalVocabTarget > 0 ? Math.min(100, Math.round((vocabulary.length / totalVocabTarget) * 100)) : 0

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title">🈶 Học tiếng Trung</h1>
            {courses.length > 0 && (
              <select
                className="mochi-input"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem', fontWeight: 700, borderRadius: 999 }}
                value={activeCourse?.id || ''}
                onChange={e => handleSwitchCourse(e.target.value)}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="page-subtitle">
            {activeCourse ? `${activeCourse.name} · Cấp độ ${activeCourse.level}` : 'Quản lý tiến độ học tiếng Trung của bạn'}
          </p>
        </div>
        <div className="header-actions">
          <Link href="/chinese/import" className="mochi-btn mochi-btn-secondary mochi-btn-sm">
            📥 Nhập HSK
          </Link>
          <Link href="/chinese/vocabulary?action=add" className="mochi-btn mochi-btn-secondary mochi-btn-sm">
            + Từ vựng
          </Link>
          <Link href="/chinese/review" className={`mochi-btn mochi-btn-primary mochi-btn-sm ${dueVocab.length > 0 ? 'pulse' : ''}`}>
            Ôn tập {dueVocab.length > 0 ? `(${dueVocab.length})` : ''}
          </Link>
        </div>
      </div>

      {/* Empty State when no course */}
      {!activeCourse ? (
        <div className="mochi-card mochi-empty-state">
          <div className="mascot">🈶</div>
          <h2>Chưa có khóa học nào</h2>
          <p>Hãy tạo hoặc nhập khóa học tiếng Trung đầu tiên để bắt đầu học nhé!</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/chinese/import" className="mochi-btn mochi-btn-primary">
              📥 Nhập dữ liệu CSV / URL
            </Link>
            <Link href="/settings" className="mochi-btn mochi-btn-secondary">
              ⚙️ Tạo khóa học mới
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Hero progress card */}
          <div className="hero-card">
            <div className="hero-left">
              <div className="hsk-badge">{activeCourse.level}</div>
              <h2 className="hero-title">
                {vocabulary.length}/{totalVocabTarget} từ vựng
              </h2>
              <p className="hero-sub">{completedLessons.length}/{lessons.length} bài đã hoàn thành</p>

              <div className="hero-streak">
                <span className="streak-fire">🔥</span>
                <span className="streak-count">{streak}</span>
                <span className="streak-label">ngày liên tục</span>
              </div>

              <div className="mochi-progress" style={{ marginTop: 12 }}>
                <div className="mochi-progress-bar study" style={{ width: `${courseProgress}%` }} />
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--lavender-500)', marginTop: 4 }}>
                {courseProgress}% hoàn thành khóa học
              </div>
            </div>

            <div className="hero-ring">
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProgressRing value={vocabulary.length} max={totalVocabTarget} color="#8F71F5" size={120} />
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--chocolate-600)' }}>{courseProgress}%</div>
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
              {studyGoal && <div className="ts-goal">Mục tiêu: {studyGoal.daily_minutes}p</div>}
            </div>
            <div className="today-stat">
              <div className="ts-emoji">🌟</div>
              <div className="ts-value">{masteredVocab.length}</div>
              <div className="ts-label">từ thành thạo</div>
            </div>
          </div>

          {/* Nav quick links */}
          <div className="quick-links">
            <Link href="/chinese/lessons" className="quick-link-card">
              <span className="ql-emoji">📚</span>
              <div>
                <div className="ql-title">Bài học</div>
                <div className="ql-sub">{lessons.length} bài học</div>
              </div>
            </Link>
            <Link href="/chinese/vocabulary" className="quick-link-card">
              <span className="ql-emoji">🔤</span>
              <div>
                <div className="ql-title">Từ vựng</div>
                <div className="ql-sub">{vocabulary.length} từ</div>
              </div>
            </Link>
            <Link href="/chinese/grammar" className="quick-link-card">
              <span className="ql-emoji">✍️</span>
              <div>
                <div className="ql-title">Ngữ pháp</div>
                <div className="ql-sub">Các cấu trúc quan trọng</div>
              </div>
            </Link>
            <Link href="/chinese/vocabulary/quiz" className="quick-link-card">
              <span className="ql-emoji">🎯</span>
              <div>
                <div className="ql-title">Trắc nghiệm</div>
                <div className="ql-sub">Kiểm tra kiến thức</div>
              </div>
            </Link>
          </div>
        </>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 4px 0 0; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .hero-card { background: linear-gradient(135deg, #F5F2FF, #FFFDF0); border-radius: 24px; padding: 24px; border: 1.5px solid var(--lavender-200); box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .hsk-badge { display: inline-block; background: var(--lavender-400); color: white; font-weight: 800; font-size: 0.75rem; padding: 4px 12px; border-radius: 999px; margin-bottom: 8px; }
        .hero-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .hero-sub { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0 0 12px; }
        .hero-streak { display: inline-flex; align-items: center; gap: 6px; background: white; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--chocolate-100); font-weight: 700; font-size: 0.85rem; }
        .today-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .today-stat { background: white; border-radius: 20px; padding: 16px; border: 1.5px solid var(--chocolate-100); text-align: center; box-shadow: var(--shadow-sm); }
        .ts-emoji { font-size: 1.5rem; margin-bottom: 4px; }
        .ts-value { font-size: 1.3rem; font-weight: 800; color: var(--chocolate-600); }
        .ts-label { font-size: 0.75rem; font-weight: 600; color: var(--chocolate-400); }
        .ts-goal { font-size: 0.7rem; font-weight: 700; color: var(--lavender-500); margin-top: 2px; }
        .quick-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        .quick-link-card { background: white; border-radius: 20px; padding: 16px; border: 1.5px solid var(--chocolate-100); display: flex; align-items: center; gap: 12px; text-decoration: none; transition: all 0.2s; box-shadow: var(--shadow-sm); }
        .quick-link-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--lavender-300); }
        .ql-emoji { font-size: 1.8rem; }
        .ql-title { font-weight: 800; font-size: 0.9rem; color: var(--chocolate-600); }
        .ql-sub { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; }
        @media (max-width: 640px) {
          .today-stats { grid-template-columns: repeat(2, 1fr); }
          .hero-ring { display: none; }
        }
      `}</style>
    </div>
  )
}
