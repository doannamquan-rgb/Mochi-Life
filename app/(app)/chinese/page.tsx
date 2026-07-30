'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { fetchChineseStats, type ChineseStats } from '@/lib/chinese-stats'
import { notifyDataChanged } from '@/lib/events'
import { toast } from 'sonner'

function ProgressRing({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const r = size / 2 - 6
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0E6D8" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
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
  const [stats, setStats] = useState<ChineseStats | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setErrorMsg(null)
    const supabase = createClient()
    try {
      const res = await fetchChineseStats(supabase, user.id, profile?.active_hsk_course_id)
      setStats(res)
      if (res.error) {
        setErrorMsg('Không thể lấy đầy đủ thống kê từ server: ' + res.error)
      }
    } catch (err: any) {
      console.error('Failed to load Chinese stats:', err)
      setErrorMsg('Đã xảy ra lỗi khi tải dữ liệu tiếng Trung.')
    } finally {
      setLoading(false)
    }
  }, [user, profile?.active_hsk_course_id])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  // Automatic refetch on internal navigation data change signals
  useDataChanged('chinese', loadData)

  async function handleSwitchCourse(courseId: string) {
    if (!user) return
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({ active_hsk_course_id: courseId })
      .eq('user_id', user.id)

    if (error) {
      toast.error('Không thể chuyển khóa học: ' + error.message)
      return
    }

    const selected = stats?.allCourses.find(c => c.id === courseId)
    if (selected) {
      toast.success(`Đã chuyển sang khóa học: ${selected.name}`)
      notifyDataChanged('chinese', 'course', courseId)
      loadData()
    }
  }

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="mochi-skeleton" style={{ height: 160, borderRadius: 24 }} />
        ))}
      </div>
    )
  }

  if (errorMsg && !stats?.activeCourse) {
    return (
      <div className="page">
        <div className="mochi-card mochi-empty-state">
          <div className="mascot">😿</div>
          <h2>Không thể tải dữ liệu tiếng Trung</h2>
          <p>{errorMsg}</p>
          <button className="mochi-btn mochi-btn-primary" onClick={loadData}>
            🔄 Thử lại
          </button>
        </div>
      </div>
    )
  }

  const activeCourse = stats?.activeCourse ?? null
  const courses = stats?.allCourses ?? []
  const dueCount = stats?.dueVocabulary ?? 0
  const todayMinutes = stats?.todaySession?.duration_minutes ?? 0

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
          <Link href="/chinese/review" className={`mochi-btn mochi-btn-primary mochi-btn-sm ${dueCount > 0 ? 'pulse' : ''}`}>
            Ôn tập {dueCount > 0 ? `(${dueCount})` : ''}
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="error-banner" style={{ background: '#FFF4F0', border: '1.5px solid var(--peach-300)', padding: '12px 16px', borderRadius: 16, color: 'var(--peach-600)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMsg}</span>
          <button className="mochi-btn mochi-btn-sm mochi-btn-secondary" onClick={loadData}>Thử lại</button>
        </div>
      )}

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
                {stats?.learnedVocabulary}/{stats?.targetVocabulary} từ vựng
              </h2>
              <p className="hero-sub">
                {stats?.completedLessons}/{stats?.totalLessons} bài đã hoàn thành
              </p>

              <div className="hero-streak">
                <span className="streak-fire">🔥</span>
                <span className="streak-count">{stats?.streak ?? 0}</span>
                <span className="streak-label">ngày liên tục</span>
              </div>

              <div className="mochi-progress" style={{ marginTop: 12 }}>
                <div className="mochi-progress-bar study" style={{ width: `${stats?.progressPercent ?? 0}%` }} />
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--lavender-500)', marginTop: 4 }}>
                {stats?.progressPercent ?? 0}% hoàn thành khóa học
              </div>
            </div>

            <div className="hero-ring">
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProgressRing value={stats?.learnedVocabulary ?? 0} max={stats?.targetVocabulary ?? 1} color="#8F71F5" size={120} />
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--chocolate-600)' }}>
                    {stats?.progressPercent ?? 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today stats */}
          <div className="today-stats">
            <div className="today-stat">
              <div className="ts-emoji">📖</div>
              <div className="ts-value">{stats?.newTodayVocabulary ?? 0}</div>
              <div className="ts-label">từ mới hôm nay</div>
              {stats?.studyGoal && <div className="ts-goal">Mục tiêu: {stats.studyGoal.daily_new_words}</div>}
            </div>
            <div className="today-stat">
              <div className="ts-emoji">🔄</div>
              <div className="ts-value">{stats?.reviewedVocabulary ?? 0}</div>
              <div className="ts-label">từ đã ôn</div>
            </div>
            <div className="today-stat">
              <div className="ts-emoji">⏱️</div>
              <div className="ts-value">{todayMinutes}</div>
              <div className="ts-label">phút học</div>
              {stats?.studyGoal && <div className="ts-goal">Mục tiêu: {stats.studyGoal.daily_minutes}p</div>}
            </div>
            <div className="today-stat">
              <div className="ts-emoji">🌟</div>
              <div className="ts-value">{stats?.masteredVocabulary ?? 0}</div>
              <div className="ts-label">từ thành thạo</div>
            </div>
          </div>

          {/* Nav quick links */}
          <div className="quick-links">
            <Link href="/chinese/lessons" className="quick-link-card">
              <span className="ql-emoji">📚</span>
              <div>
                <div className="ql-title">Bài học</div>
                <div className="ql-sub">{stats?.totalLessons ?? 0} bài học</div>
              </div>
            </Link>
            <Link href="/chinese/vocabulary" className="quick-link-card">
              <span className="ql-emoji">🔤</span>
              <div>
                <div className="ql-title">Từ vựng</div>
                <div className="ql-sub">{stats?.totalVocabulary ?? 0} từ</div>
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
