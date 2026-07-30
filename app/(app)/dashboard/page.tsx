'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { fetchChineseStats, type ChineseStats } from '@/lib/chinese-stats'
import { fetchFitnessStats, type FitnessStats } from '@/lib/fitness-stats'
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

  const [cStats, setCStats] = useState<ChineseStats | null>(null)
  const [fStats, setFStats] = useState<FitnessStats | null>(null)
  const [currentLesson, setCurrentLesson] = useState<HskLesson | null>(null)

  // Expense state
  const [todayExpense, setTodayExpense] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [monthBudget, setMonthBudget] = useState<Budget | null>(null)
  const [topCategory, setTopCategory] = useState<string>('')

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [chineseRes, fitnessRes, transactions, budget, lesson] = await Promise.all([
      fetchChineseStats(supabase, user.id, profile?.active_hsk_course_id),
      fetchFitnessStats(supabase, user.id, '30d'),
      supabase.from('transactions').select('amount, type, transaction_date, description, category:expense_categories(name, icon)').eq('user_id', user.id).gte('transaction_date', monthStart).order('transaction_date', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('is_total_budget', true).eq('month', now.getMonth() + 1).eq('year', now.getFullYear()).maybeSingle(),
      supabase.from('hsk_lessons').select('*').eq('user_id', user.id).eq('status', 'in_progress').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    setCStats(chineseRes)
    setFStats(fitnessRes)
    setCurrentLesson(lesson.data ?? null)

    // Calculate expense stats
    const txData: any[] = transactions.data ?? []
    const todayTx = txData.filter((t: any) => t.transaction_date === today && t.type === 'expense')
    const monthTx = txData.filter((t: any) => t.type === 'expense')
    setTodayExpense(todayTx.reduce((sum: number, t: any) => sum + t.amount, 0))
    setMonthExpense(monthTx.reduce((sum: number, t: any) => sum + t.amount, 0))
    setMonthBudget(budget.data ?? null)

    // Top category
    const catMap: Record<string, number> = {}
    monthTx.forEach((t: any) => {
      const cat = (t.category as any)?.name ?? 'Khác'
      catMap[cat] = (catMap[cat] ?? 0) + t.amount
    })
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
    setTopCategory(topCat ? `${topCat[0]}` : '')

    setLoading(false)
  }, [user, profile?.active_hsk_course_id, today])

  useEffect(() => {
    if (user) loadDashboardData()
  }, [user, loadDashboardData])

  useDataChanged('all', loadDashboardData)

  const greeting = getGreeting()
  const latestWeight = fStats?.latestWeight ?? null
  const weightGoal = fStats?.weightGoal ?? null
  const todayCalories = fStats?.todayCalories ?? 0
  const todayMinutes = fStats?.todayMinutes ?? 0
  const weightProgress = fStats?.weightProgress ?? 0

  const budgetUsedPct = monthBudget ? getPercent(monthExpense, monthBudget.amount) : 0

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
              <div className="module-subtitle">{cStats?.activeCourse?.level ?? 'Tổng quan'}</div>
            </div>
          </div>

          <div className="module-stats">
            <StatItem
              label="Từ mới hôm nay"
              value={cStats?.newTodayVocabulary ?? 0}
            />
            <StatItem
              label="Cần ôn"
              value={cStats?.dueVocabulary ?? 0}
              sub="từ"
            />
            <StatItem
              label="Chuỗi ngày"
              value={`${cStats?.streak ?? 0} 🔥`}
            />
          </div>

          <div className="module-progress">
            <div className="progress-label">
              <span>{cStats?.activeCourse?.name ?? 'Khóa học'}: {cStats?.learnedVocabulary ?? 0}/{cStats?.targetVocabulary ?? 1} từ</span>
              <span>{cStats?.progressPercent ?? 0}%</span>
            </div>
            <ProgressBar value={cStats?.progressPercent ?? 0} max={100} colorClass="study" />
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
