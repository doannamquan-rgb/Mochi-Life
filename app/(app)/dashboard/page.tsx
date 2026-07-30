'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { getGreeting, formatDate, todayString, getDateRange } from '@/lib/date-utils'
import { formatVND, formatVNDCompact, formatWeight, formatDuration, getPercent, EXERCISE_TYPES } from '@/lib/format'
import type { WeightLog, WeightGoal, ExerciseLog, FitnessGoal, StudySession, StudyGoal, Transaction, Budget, ExpenseCategory, HskVocabulary, HskLesson } from '@/lib/types'

function ProgressBar({ value, max, colorClass = '' }: { value: number; max: number; colorClass?: string }) {
  const pct = getPercent(value, max)
  return (
    <div className="mochi-progress">
      <div
        className={`mochi-progress-bar ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StatItem({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="stat-item">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile } = useUser()
  const [loading, setLoading] = useState(true)
  const today = todayString()

  // Fitness state
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null)
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null)
  const [todayExercise, setTodayExercise] = useState<ExerciseLog[]>([])
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null)

  // Chinese state
  const [todayStudy, setTodayStudy] = useState<StudySession | null>(null)
  const [studyGoal, setStudyGoal] = useState<StudyGoal | null>(null)
  const [dueVocab, setDueVocab] = useState(0)
  const [totalVocab, setTotalVocab] = useState(0)
  const [studyStreak, setStudyStreak] = useState(0)
  const [currentLesson, setCurrentLesson] = useState<HskLesson | null>(null)
  const [activeCourseInfo, setActiveCourseInfo] = useState({ name: 'Tiếng Trung', level: 'Tổng quan', target: 100 })

  // Expense state
  const [todayExpense, setTodayExpense] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [monthBudget, setMonthBudget] = useState<Budget | null>(null)
  const [topCategory, setTopCategory] = useState<string>('')

  // Recent activity
  const [recentActivity, setRecentActivity] = useState<Array<{ type: string; label: string; emoji: string; time: string }>>([]
  )

  useEffect(() => {
    if (!user) return
    loadDashboardData()
  }, [user])

  async function loadDashboardData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [wGoal, wLog, exLogs, fGoal, studySess, sGoal, vocab, transactions, budget, lesson] = await Promise.all([
      supabase.from('weight_goals').select('*').eq('user_id', user.id).single(),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(1).single(),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).eq('log_date', today),
      supabase.from('fitness_goals').select('*').eq('user_id', user.id).single(),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).eq('session_date', today).single(),
      supabase.from('study_goals').select('*').eq('user_id', user.id).single(),
      supabase.from('hsk_vocabulary').select('id, next_review_at, memory_level').eq('user_id', user.id),
      supabase.from('transactions').select('amount, type, transaction_date, description, category:expense_categories(name, icon)').eq('user_id', user.id).gte('transaction_date', monthStart).order('transaction_date', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('is_total_budget', true).eq('month', now.getMonth() + 1).eq('year', now.getFullYear()).single(),
      supabase.from('hsk_lessons').select('*').eq('user_id', user.id).eq('status', 'in_progress').order('updated_at', { ascending: false }).limit(1).single(),
    ])

    setWeightGoal(wGoal.data)
    setLatestWeight(wLog.data)
    setTodayExercise(exLogs.data ?? [])
    setFitnessGoal(fGoal.data)
    setTodayStudy(studySess.data)
    setStudyGoal(sGoal.data)
    setCurrentLesson(lesson.data)

    // Active course and vocab stats
    let courseName = 'Tiếng Trung'
    let courseLevel = 'Tổng quan'
    let courseTotalTarget = 100

    if (profile?.active_hsk_course_id) {
      const { data: activeCourseData } = await supabase.from('hsk_courses').select('*').eq('id', profile.active_hsk_course_id).single()
      if (activeCourseData) {
        courseName = activeCourseData.name
        courseLevel = activeCourseData.level
        if (activeCourseData.total_vocabulary > 0) courseTotalTarget = activeCourseData.total_vocabulary
      }
    } else {
      const { data: firstCourse } = await supabase.from('hsk_courses').select('*').eq('user_id', user.id).limit(1).single()
      if (firstCourse) {
        courseName = firstCourse.name
        courseLevel = firstCourse.level
        if (firstCourse.total_vocabulary > 0) courseTotalTarget = firstCourse.total_vocabulary
      }
    }

    setActiveCourseInfo({ name: courseName, level: courseLevel, target: courseTotalTarget })

    if (vocab.data) {
      setTotalVocab(vocab.data.length)
      const due = vocab.data.filter((v: any) => v.memory_level !== 'not_learned' && new Date(v.next_review_at) <= new Date()).length
      setDueVocab(due)
    }

    // Calculate expense stats
    const txData: any[] = transactions.data ?? []
    const todayTx = txData.filter((t: any) => t.transaction_date === today && t.type === 'expense')
    const monthTx = txData.filter((t: any) => t.type === 'expense')
    setTodayExpense(todayTx.reduce((sum: number, t: any) => sum + t.amount, 0))
    setMonthExpense(monthTx.reduce((sum: number, t: any) => sum + t.amount, 0))
    setMonthBudget(budget.data)

    // Top category
    const catMap: Record<string, number> = {}
    monthTx.forEach((t: any) => {
      const cat = (t.category as any)?.name ?? 'Khác'
      catMap[cat] = (catMap[cat] ?? 0) + t.amount
    })
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
    setTopCategory(topCat ? `${topCat[0]}` : '')

    // Calculate study streak
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('session_date')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(60)

    if (sessions) {
      let streak = 0
      const dateSet = new Set((sessions as Array<{ session_date: string }>).map((s: any) => s.session_date))
      const checkDate = new Date()
      while (true) {
        const ds = checkDate.toISOString().split('T')[0]
        if (dateSet.has(ds)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else break
      }
      setStudyStreak(streak)
    }

    setLoading(false)
  }

  const greeting = getGreeting()
  const todayCalories = todayExercise.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)
  const todayMinutes = todayExercise.reduce((sum, e) => sum + e.duration_minutes, 0)
  const weightProgress = weightGoal
    ? getPercent(
        (weightGoal.starting_weight - (latestWeight?.weight ?? weightGoal.starting_weight)),
        (weightGoal.starting_weight - weightGoal.target_weight)
      )
    : 0

  const budgetUsedPct = monthBudget ? getPercent(monthExpense, monthBudget.amount) : 0
  const hskProgress = getPercent(totalVocab, activeCourseInfo.target)

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-greeting">
          <div className="mochi-skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
          <div className="mochi-skeleton" style={{ width: 280, height: 20 }} />
        </div>
        <div className="dashboard-cards">
          {[1,2,3].map(i => (
            <div key={i} className="mochi-card" style={{ padding: 24, height: 200 }}>
              <div className="mochi-skeleton" style={{ height: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <div className="greeting-left">
          <h1 className="greeting-title">
            {greeting}, {profile?.display_name?.split(' ').slice(-1)[0] ?? 'bạn'}! 🐱
          </h1>
          <p className="greeting-sub">Hôm nay bạn đã tiến gần mục tiêu hơn chưa?</p>
          <p className="greeting-date">{formatDate(today)}</p>
        </div>
        <div className="greeting-right">
          <span className="greeting-mascot animate-float">🐱</span>
        </div>
      </div>

      {/* 3 Module Cards */}
      <div className="dashboard-cards">
        {/* Fitness Card */}
        <Link href="/fitness" className="module-card module-fitness animate-slide-up">
          <div className="module-card-header">
            <div className="module-icon">💪</div>
            <div>
              <div className="module-title">Giảm cân</div>
              <div className="module-subtitle">Luyện tập</div>
            </div>
          </div>

          <div className="module-stats">
            <StatItem
              label="Cân nặng"
              value={latestWeight ? `${latestWeight.weight} kg` : '–'}
            />
            <StatItem
              label="Mục tiêu"
              value={weightGoal ? `${weightGoal.target_weight} kg` : '–'}
            />
            <StatItem
              label="Hôm nay"
              value={`${todayCalories} kcal`}
              sub={`${todayMinutes} phút`}
            />
          </div>

          {weightGoal && (
            <div className="module-progress">
              <div className="progress-label">
                <span>Tiến độ</span>
                <span>{weightProgress}%</span>
              </div>
              <ProgressBar value={weightProgress} max={100} colorClass="fitness" />
            </div>
          )}

          <div className="module-cta">Xem chi tiết →</div>
        </Link>

        {/* Chinese Card */}
        <Link href="/chinese" className="module-card module-study animate-slide-up delay-100">
          <div className="module-card-header">
            <div className="module-icon">🈶</div>
            <div>
              <div className="module-title">Tiếng Trung</div>
              <div className="module-subtitle">{activeCourseInfo.level}</div>
            </div>
          </div>

          <div className="module-stats">
            <StatItem
              label="Từ mới hôm nay"
              value={todayStudy?.new_words_count ?? 0}
            />
            <StatItem
              label="Cần ôn"
              value={dueVocab}
              sub="từ"
            />
            <StatItem
              label="Chuỗi ngày"
              value={`${studyStreak} 🔥`}
            />
          </div>

          <div className="module-progress">
            <div className="progress-label">
              <span>{activeCourseInfo.level}: {totalVocab}/{activeCourseInfo.target} từ</span>
              <span>{hskProgress}%</span>
            </div>
            <ProgressBar value={hskProgress} max={100} colorClass="study" />
          </div>

          {currentLesson && (
            <div className="module-current-lesson">
              📖 {currentLesson.title}
            </div>
          )}

          <div className="module-cta">Học tiếp →</div>
        </Link>

        {/* Expense Card */}
        <Link href="/expenses" className="module-card module-expense animate-slide-up delay-200">
          <div className="module-card-header">
            <div className="module-icon">💰</div>
            <div>
              <div className="module-title">Chi tiêu</div>
              <div className="module-subtitle">Tháng này</div>
            </div>
          </div>

          <div className="module-stats">
            <StatItem
              label="Hôm nay"
              value={formatVNDCompact(todayExpense)}
            />
            <StatItem
              label="Tháng này"
              value={formatVNDCompact(monthExpense)}
            />
            <StatItem
              label="Còn lại"
              value={monthBudget
                ? formatVNDCompact(Math.max(0, monthBudget.amount - monthExpense))
                : '–'
              }
            />
          </div>

          {monthBudget && (
            <div className="module-progress">
              <div className="progress-label">
                <span>Ngân sách</span>
                <span className={budgetUsedPct >= 90 ? 'text-danger' : ''}>
                  {budgetUsedPct}%
                </span>
              </div>
              <ProgressBar
                value={budgetUsedPct}
                max={100}
                colorClass={budgetUsedPct >= 90 ? 'danger' : 'expense'}
              />
            </div>
          )}

          {topCategory && (
            <div className="module-top-cat">
              Chi nhiều nhất: <strong>{topCategory}</strong>
            </div>
          )}

          <div className="module-cta">Xem chi tiết →</div>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <h2 className="section-title">Thêm nhanh</h2>
        <div className="quick-action-grid">
          <Link href="/fitness/weight?action=add" className="quick-action">
            <span>⚖️</span> Ghi cân
          </Link>
          <Link href="/fitness/exercise?action=add" className="quick-action">
            <span>🏃</span> Buổi tập
          </Link>
          <Link href="/chinese/vocabulary?action=add" className="quick-action">
            <span>🈶</span> Từ vựng
          </Link>
          <Link href="/expenses?action=add" className="quick-action">
            <span>💸</span> Giao dịch
          </Link>
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 32px;
        }

        .dashboard-greeting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding: 24px;
          background: white;
          border-radius: 24px;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--chocolate-100);
        }

        .greeting-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0 0 6px;
        }

        .greeting-sub {
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 0 0 4px;
          font-size: 0.9rem;
        }

        .greeting-date {
          color: var(--chocolate-300);
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0;
        }

        .greeting-mascot {
          font-size: 3rem;
          display: inline-block;
        }

        .dashboard-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .module-card {
          background: white;
          border-radius: 24px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--chocolate-100);
          text-decoration: none;
          color: var(--chocolate-600);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .module-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .module-fitness { border-top: 3px solid var(--peach-300); }
        .module-study { border-top: 3px solid var(--lavender-300); }
        .module-expense { border-top: 3px solid var(--mint-300); }

        .module-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .module-icon {
          font-size: 1.8rem;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
          border-radius: 14px;
          flex-shrink: 0;
        }

        .module-title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--chocolate-600);
          line-height: 1.2;
        }

        .module-subtitle {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--chocolate-300);
        }

        .module-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 12px;
          background: var(--cream);
          border-radius: 16px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 800;
          color: var(--chocolate-600);
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--chocolate-400);
          margin-top: 2px;
        }

        .stat-sub {
          font-size: 0.65rem;
          color: var(--chocolate-300);
          font-weight: 600;
        }

        .module-progress {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--chocolate-500);
        }

        .text-danger { color: var(--peach-500); }

        .module-cta {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--chocolate-400);
          margin-top: auto;
        }

        .module-current-lesson {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--lavender-500);
          background: var(--lavender-50);
          padding: 6px 10px;
          border-radius: 10px;
        }

        .module-top-cat {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--mint-500);
          background: var(--mint-50);
          padding: 6px 10px;
          border-radius: 10px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0 0 12px;
        }

        .quick-actions {
          background: white;
          border-radius: 24px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--chocolate-100);
        }

        .quick-action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .quick-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--cream);
          border-radius: 16px;
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--chocolate-600);
          text-decoration: none;
          transition: all 0.15s;
        }

        .quick-action:hover {
          background: var(--cheese-100);
          transform: translateY(-1px);
        }

        @media (max-width: 1024px) {
          .dashboard-cards {
            grid-template-columns: 1fr;
          }
          .quick-action-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .dashboard-greeting {
            padding: 16px;
          }
          .greeting-title { font-size: 1.2rem; }
          .greeting-mascot { font-size: 2.5rem; }
        }
      `}</style>
    </div>
  )
}
