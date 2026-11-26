'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { fetchChineseStats, type ChineseStats } from '@/lib/chinese-stats'
import { fetchFitnessStats, type FitnessStats } from '@/lib/fitness-stats'
import { MochiDailyBrief } from '@/components/ai/MochiDailyBrief'
import { getGreeting, formatDate, todayString } from '@/lib/date-utils'
import {
  formatVNDCompact,
  getPercent,
  HEALTH_PAGE_TITLE,
} from '@/lib/format'
import {
  getDashboardNextAction,
  type DashboardActionId,
  type DailyChecklist,
  type Budget,
  type HskLesson,
} from '@mochi/shared'
import { toast } from 'sonner'

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

function getActionHref(actionId: DashboardActionId): string {
  switch (actionId) {
    case 'review_vocab':
      return '/chinese/vocabulary/flashcard'
    case 'study_session':
      return '/chinese'
    case 'log_exercise':
      return '/fitness/exercise?action=add'
    case 'log_weight':
    case 'first_log':
      return '/fitness/weight?action=add'
    case 'log_transaction':
      return '/expenses?action=add'
    case 'ask_ai':
      return '/ai'
    case 'complete_checklist':
    default:
      return '#today-checklist'
  }
}

function getDomainEmoji(domain: string): string {
  switch (domain) {
    case 'study':
      return '🈶'
    case 'fitness':
      return '💪'
    case 'expense':
      return '💰'
    case 'checklist':
      return '🎯'
    default:
      return '✨'
  }
}

export default function DashboardPage() {
  const { user, profile } = useUser()
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const today = todayString()

  const [cStats, setCStats] = useState<ChineseStats | null>(null)
  const [fStats, setFStats] = useState<FitnessStats | null>(null)
  const [currentLesson, setCurrentLesson] = useState<HskLesson | null>(null)
  const [checklist, setChecklist] = useState<DailyChecklist[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)

  // Expense state
  const [todayExpense, setTodayExpense] = useState(0)
  const [todayTxCount, setTodayTxCount] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [monthBudget, setMonthBudget] = useState<Budget | null>(null)
  const [topCategory, setTopCategory] = useState<string>('')

  const hasLoadedRef = useRef(false)
  const checklistRef = useRef<HTMLElement | null>(null)

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    if (hasLoadedRef.current) {
      setRefreshing(true)
    } else {
      setInitialLoading(true)
    }
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const [chineseRes, fitnessRes, transactions, budget, lesson, checklistRes] = await Promise.all([
        fetchChineseStats(supabase, user.id, profile?.active_hsk_course_id),
        fetchFitnessStats(supabase, user.id, '30d'),
        supabase
          .from('transactions')
          .select('amount, type, transaction_date, description, category:expense_categories(name, icon)')
          .eq('user_id', user.id)
          .gte('transaction_date', monthStart)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_total_budget', true)
          .eq('month', now.getMonth() + 1)
          .eq('year', now.getFullYear())
          .maybeSingle(),
        supabase
          .from('hsk_lessons')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('daily_checklists')
          .select('*')
          .eq('user_id', user.id)
          .eq('checklist_date', today)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
      ])

      const errors = [
        chineseRes.error,
        fitnessRes.error,
        transactions.error?.message,
        budget.error?.message,
        lesson.error?.message,
        checklistRes.error?.message,
      ].filter(Boolean)

      if (errors.length > 0 && !hasLoadedRef.current) {
        setErrorMsg('Không thể tải đầy đủ dữ liệu bảng điều khiển. Vui lòng kiểm tra mạng và thử lại.')
        setInitialLoading(false)
        setRefreshing(false)
        return
      }

      if (errors.length > 0) {
        setErrorMsg('Không thể làm mới dữ liệu lúc này. Đang hiển thị dữ liệu gần nhất.')
      }

      setCStats(chineseRes)
      setFStats(fitnessRes)
      setCurrentLesson(lesson.data ?? null)
      setChecklist((checklistRes.data ?? []) as DailyChecklist[])

      // Calculate expense stats
      const txData: Array<{
        amount: number
        type: 'expense' | 'income'
        transaction_date: string
        category?: { name?: string } | Array<{ name?: string }> | null
      }> = (transactions.data as any[]) ?? []

      const todayTxAll = txData.filter(t => t.transaction_date === today)
      const todayExp = todayTxAll.filter(t => t.type === 'expense')
      const monthTx = txData.filter(t => t.type === 'expense')
      setTodayTxCount(todayTxAll.length)
      setTodayExpense(todayExp.reduce((sum, t) => sum + t.amount, 0))
      setMonthExpense(monthTx.reduce((sum, t) => sum + t.amount, 0))
      setMonthBudget(budget.data ?? null)

      // Top category
      const catMap: Record<string, number> = {}
      monthTx.forEach(t => {
        const catObj = Array.isArray(t.category) ? t.category[0] : t.category
        const cat = catObj?.name ?? 'Khác'
        catMap[cat] = (catMap[cat] ?? 0) + t.amount
      })
      const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
      setTopCategory(topCat ? topCat[0] : '')

      hasLoadedRef.current = true
    } catch {
      setErrorMsg(
        hasLoadedRef.current
          ? 'Mất kết nối khi làm mới dữ liệu. Đang giữ dữ liệu hiện có.'
          : 'Không thể kết nối để tải dữ liệu bảng điều khiển. Vui lòng thử lại.'
      )
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [user, profile?.active_hsk_course_id, today])

  useEffect(() => {
    if (user) loadDashboardData()
  }, [user, loadDashboardData])

  useDataChanged('all', loadDashboardData)

  async function handleToggleChecklist(item: DailyChecklist) {
    if (!user) return
    const nextCompleted = !item.is_completed
    setChecklist(prev => prev.map(x => (x.id === item.id ? { ...x, is_completed: nextCompleted } : x)))
    const supabase = createClient()
    const { error } = await supabase
      .from('daily_checklists')
      .update({ is_completed: nextCompleted, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('user_id', user.id)

    if (error) {
      setChecklist(prev => prev.map(x => (x.id === item.id ? { ...x, is_completed: item.is_completed } : x)))
      toast.error('Không thể cập nhật mục tiêu')
      return
    }

    if (nextCompleted) {
      await supabase.from('user_xp_logs').insert({
        user_id: user.id,
        amount: 5,
        action_type: 'checklist_completed',
        reference_id: item.id,
      })
    }
  }

  async function handleAddChecklist(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newTodoText.trim()) return
    setAddingTodo(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_checklists')
        .insert({
          user_id: user.id,
          checklist_date: today,
          item_text: newTodoText.trim(),
          category: 'other',
          is_completed: false,
          sort_order: checklist.length + 1,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        setChecklist(prev => [...prev, data as DailyChecklist])
      }
      setNewTodoText('')
    } catch {
      toast.error('Không thể thêm việc cần làm')
    } finally {
      setAddingTodo(false)
    }
  }

  const greeting = getGreeting()
  const latestWeight = fStats?.latestWeight ?? null
  const weightGoal = fStats?.weightGoal ?? null
  const todayCalories = fStats?.todayCalories ?? 0
  const todayMinutes = fStats?.todayMinutes ?? 0
  const weightProgress = fStats?.weightProgress ?? 0
  const budgetUsedPct = monthBudget ? getPercent(monthExpense, monthBudget.amount) : 0

  const completedChecklistCount = checklist.filter(c => c.is_completed).length
  const nextPendingItem = checklist.find(c => !c.is_completed)

  const focusPlan = getDashboardNextAction({
    today,
    hasActiveCourse: !!cStats?.activeCourse,
    totalVocabulary: cStats?.totalVocabulary ?? 0,
    dueVocabulary: cStats?.dueVocabulary ?? 0,
    todayStudyMinutes: cStats?.todaySession?.duration_minutes ?? 0,
    streak: cStats?.streak ?? 0,
    hasWeightGoal: !!weightGoal,
    latestWeightDate: latestWeight?.log_date ?? null,
    todayExerciseMinutes: todayMinutes,
    weekExerciseSessions: fStats?.weekSessions ?? 0,
    weeklySessionTarget: fStats?.fitnessGoal?.weekly_sessions ?? null,
    totalChecklistCount: checklist.length,
    completedChecklistCount,
    nextChecklistItemText: nextPendingItem?.item_text ?? null,
    todayTransactionCount: todayTxCount,
    monthExpense,
    monthBudgetAmount: monthBudget?.amount ?? null,
  })

  if (initialLoading) {
    return (
      <div className="dashboard" aria-busy="true" aria-label="Đang tải tổng quan">
        <div className="dashboard-greeting">
          <div style={{ flex: 1 }}>
            <div className="mochi-skeleton" style={{ width: 220, height: 30, marginBottom: 8 }} />
            <div className="mochi-skeleton" style={{ width: 260, height: 18 }} />
          </div>
        </div>
        <div className="mochi-card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="mochi-skeleton" style={{ width: 140, height: 22, marginBottom: 12 }} />
          <div className="mochi-skeleton" style={{ width: '75%', height: 28, marginBottom: 10 }} />
          <div className="mochi-skeleton" style={{ width: '90%', height: 18, marginBottom: 16 }} />
          <div className="mochi-skeleton" style={{ width: 180, height: 42, borderRadius: 999 }} />
        </div>
        <div className="dashboard-cards">
          {[1, 2, 3].map(i => (
            <div key={i} className="mochi-card" style={{ padding: 20, height: 185 }}>
              <div className="mochi-skeleton" style={{ height: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasLoaded = cStats !== null && fStats !== null

  if (errorMsg && !hasLoaded) {
    return (
      <div className="dashboard">
        <div className="error-state-card" role="alert">
          <div className="error-mascot">😿</div>
          <h2>Không thể tải bảng điều khiển</h2>
          <p>{errorMsg}</p>
          <button type="button" className="mochi-btn mochi-btn-primary" onClick={loadDashboardData}>
            Thử lại
          </button>
        </div>
        <style jsx>{`
          .dashboard { max-width: 1120px; margin: 0 auto; padding-bottom: 32px; }
          .error-state-card {
            background: white;
            border-radius: 24px;
            padding: 36px 24px;
            text-align: center;
            border: 1.5px solid var(--peach-200);
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .error-mascot { font-size: 3rem; }
          .error-state-card h2 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); }
          .error-state-card p { margin: 0 0 8px; color: var(--chocolate-400); font-weight: 600; font-size: 0.9rem; }
        `}</style>
      </div>
    )
  }

  const primaryHref = getActionHref(focusPlan.primary.id)

  return (
    <div className="dashboard">
      {/* Inline refresh warning banner if cached data exists */}
      {errorMsg && (
        <div className="inline-error-banner" role="alert">
          <span>⚠️ {errorMsg}</span>
          <button type="button" className="mochi-btn mochi-btn-secondary mochi-btn-sm" onClick={loadDashboardData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Compact Greeting */}
      <header className="dashboard-greeting">
        <div className="greeting-left">
          <h1 className="greeting-title">
            {greeting}, {profile?.display_name?.split(' ').slice(-1)[0] ?? 'bạn'}! 🐱
          </h1>
          <p className="greeting-date">
            {formatDate(today)}
            {refreshing ? ' · Đang cập nhật...' : ''}
          </p>
        </div>
        <div className="greeting-pills">
          <span className="status-pill">🔥 {cStats?.streak ?? 0} ngày</span>
          <span className="status-pill">
            🎯 {completedChecklistCount}/{checklist.length} việc
          </span>
        </div>
      </header>

      {/* TIER 1: Primary Next Action Focus */}
      <section
        className={`hero-focus-card status-${focusPlan.status} domain-${focusPlan.primary.domain} animate-slide-up`}
        aria-labelledby="next-action-heading"
      >
        <div className="hero-top-row">
          <span className="hero-badge">
            <span aria-hidden="true">{getDomainEmoji(focusPlan.primary.domain)}</span>{' '}
            {focusPlan.primary.badge}
          </span>
          {focusPlan.primary.contextPill && (
            <span className="hero-context-pill">{focusPlan.primary.contextPill}</span>
          )}
        </div>

        <h2 id="next-action-heading" className="hero-title">
          {focusPlan.primary.title}
        </h2>
        <p className="hero-desc">{focusPlan.primary.description}</p>

        <div className="hero-actions-row">
          {focusPlan.primary.id === 'complete_checklist' ? (
            <button
              type="button"
              className="mochi-btn mochi-btn-primary hero-primary-btn"
              onClick={() => checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              {focusPlan.primary.ctaLabel} →
            </button>
          ) : (
            <Link href={primaryHref} className="mochi-btn mochi-btn-primary hero-primary-btn">
              {focusPlan.primary.ctaLabel} →
            </Link>
          )}

          {focusPlan.secondary.length > 0 && (
            <div className="hero-secondary-list" aria-label="Gợi ý tiếp theo khác">
              {focusPlan.secondary.map(item => (
                <Link key={item.id} href={getActionHref(item.id)} className="hero-secondary-chip">
                  <span aria-hidden="true">{getDomainEmoji(item.domain)}</span>
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TIER 2: Secondary Context (Daily Brief + Today's Checklist) */}
      <div className="secondary-grid">
        <div className="secondary-brief">
          {user && <MochiDailyBrief userId={user.id} />}
        </div>

        <section
          id="today-checklist"
          ref={checklistRef}
          className="checklist-panel mochi-card"
          aria-labelledby="checklist-heading"
        >
          <div className="checklist-header">
            <h2 id="checklist-heading" className="panel-title">
              🎯 Việc cần làm hôm nay
            </h2>
            <span className="checklist-counter">
              {completedChecklistCount}/{checklist.length}
            </span>
          </div>

          <form onSubmit={handleAddChecklist} className="checklist-add-row">
            <input
              type="text"
              className="mochi-input checklist-input"
              placeholder="Thêm mục tiêu nhỏ hôm nay..."
              aria-label="Thêm mục tiêu hôm nay"
              value={newTodoText}
              onChange={e => setNewTodoText(e.target.value)}
            />
            <button
              type="submit"
              className="mochi-btn mochi-btn-secondary mochi-btn-sm"
              disabled={addingTodo || !newTodoText.trim()}
            >
              + Thêm
            </button>
          </form>

          {checklist.length === 0 ? (
            <p className="checklist-empty">
              Chưa có mục nào cho hôm nay. Thêm 1–2 việc nhỏ để giữ nhịp nhé!
            </p>
          ) : (
            <ul className="checklist-list">
              {checklist.slice(0, 5).map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`checklist-item-btn ${item.is_completed ? 'done' : ''}`}
                    onClick={() => handleToggleChecklist(item)}
                    aria-pressed={item.is_completed}
                  >
                    <span className="check-box" aria-hidden="true">
                      {item.is_completed ? '✓' : ''}
                    </span>
                    <span className="check-text">{item.item_text}</span>
                  </button>
                </li>
              ))}
              {checklist.length > 5 && (
                <li className="checklist-more">
                  <Link href="/calendar">Xem tất cả {checklist.length} mục →</Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* TIER 3: Subordinate Domain Progress */}
      <section aria-labelledby="domains-heading">
        <div className="section-header-row">
          <h2 id="domains-heading" className="section-title">
            Tổng quan các lĩnh vực
          </h2>
          <Link href="/reports" className="section-more-link">
            Xem báo cáo →
          </Link>
        </div>

        <div className="dashboard-cards">
          {/* Health & Fitness Card */}
          <Link href="/fitness" className="module-card module-fitness">
            <div className="module-card-header">
              <div className="module-icon">💪</div>
              <div>
                <div className="module-title">{HEALTH_PAGE_TITLE}</div>
                <div className="module-subtitle">Cân nặng & tập luyện</div>
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

            {weightGoal ? (
              <div className="module-progress">
                <div className="progress-label">
                  <span>Tiến độ mục tiêu</span>
                  <span>{weightProgress}%</span>
                </div>
                <ProgressBar value={weightProgress} max={100} colorClass="fitness" />
              </div>
            ) : (
              <div className="module-empty-hint">Chưa đặt mục tiêu cân nặng</div>
            )}

            <div className="module-cta">Xem chi tiết →</div>
          </Link>

          {/* Chinese Card */}
          <Link href="/chinese" className="module-card module-study">
            <div className="module-card-header">
              <div className="module-icon">🈶</div>
              <div>
                <div className="module-title">Tiếng Trung</div>
                <div className="module-subtitle">{cStats?.activeCourse?.level ?? 'Chưa chọn khóa'}</div>
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

            {cStats?.activeCourse ? (
              <div className="module-progress">
                <div className="progress-label">
                  <span>{cStats.activeCourse.name}: {cStats.learnedVocabulary}/{cStats.targetVocabulary} từ</span>
                  <span>{cStats.progressPercent}%</span>
                </div>
                <ProgressBar value={cStats.progressPercent} max={100} colorClass="study" />
              </div>
            ) : (
              <div className="module-empty-hint">Chưa có khóa học đang hoạt động</div>
            )}

            {currentLesson && (
              <div className="module-current-lesson">
                📖 {currentLesson.title}
              </div>
            )}

            <div className="module-cta">Học tiếp →</div>
          </Link>

          {/* Expense Card */}
          <Link href="/expenses" className="module-card module-expense">
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

            {monthBudget ? (
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
            ) : (
              <div className="module-empty-hint">Chưa đặt ngân sách tháng</div>
            )}

            {topCategory && (
              <div className="module-top-cat">
                Chi nhiều nhất: <strong>{topCategory}</strong>
              </div>
            )}

            <div className="module-cta">Xem chi tiết →</div>
          </Link>
        </div>
      </section>

      <style jsx>{`
        .dashboard {
          max-width: 1120px;
          margin: 0 auto;
          padding-bottom: 32px;
        }

        .inline-error-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background: var(--peach-50);
          border: 1.5px solid var(--peach-300);
          color: var(--peach-500);
          padding: 10px 16px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        .dashboard-greeting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
          padding: 4px 2px;
        }

        .greeting-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0 0 2px;
        }

        .greeting-date {
          color: var(--chocolate-400);
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0;
        }

        .greeting-pills {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status-pill {
          background: var(--color-surface);
          border: 1.5px solid var(--chocolate-100);
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--chocolate-600);
          box-shadow: var(--shadow-xs);
        }

        /* TIER 1: Hero Focus Card */
        .hero-focus-card {
          background: linear-gradient(135deg, #FFFDF4 0%, #FFF6D6 100%);
          border: 2px solid var(--cheese-300);
          border-radius: 26px;
          padding: 24px 26px;
          margin-bottom: 22px;
          box-shadow: var(--shadow-md);
        }

        .hero-focus-card.status-completed {
          background: linear-gradient(135deg, #F3FCF8 0%, #E3F7EE 100%);
          border-color: var(--mint-300);
        }

        .hero-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          background: var(--cheese-400);
          color: var(--chocolate-700);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .status-completed .hero-badge {
          background: var(--mint-400);
          color: white;
        }

        .hero-context-pill {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--chocolate-500);
          background: rgba(255, 255, 255, 0.85);
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--chocolate-100);
        }

        .hero-title {
          font-size: 1.35rem;
          font-weight: 900;
          color: var(--chocolate-700);
          margin: 0 0 8px;
          line-height: 1.3;
        }

        .hero-desc {
          font-size: 0.94rem;
          font-weight: 600;
          color: var(--chocolate-500);
          margin: 0 0 18px;
          max-width: 68ch;
          line-height: 1.5;
        }

        .hero-actions-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hero-primary-btn {
          padding: 12px 22px;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .hero-secondary-list {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .hero-secondary-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 13px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          border: 1.5px solid var(--chocolate-100);
          color: var(--chocolate-600);
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }

        .hero-secondary-chip:hover {
          background: white;
          border-color: var(--cheese-400);
        }

        /* TIER 2: Secondary Grid */
        .secondary-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
          align-items: start;
        }

        .secondary-brief :global(.brief-card) {
          margin-bottom: 0;
        }

        .checklist-panel {
          padding: 20px;
          border-radius: 22px;
        }

        .checklist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .panel-title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0;
        }

        .checklist-counter {
          font-size: 0.78rem;
          font-weight: 800;
          background: var(--cream);
          color: var(--chocolate-500);
          padding: 4px 10px;
          border-radius: 999px;
        }

        .checklist-add-row {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .checklist-input {
          padding: 8px 12px;
          font-size: 0.85rem;
        }

        .checklist-empty {
          font-size: 0.84rem;
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 4px 0 0;
        }

        .checklist-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .checklist-item-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid var(--chocolate-100);
          background: var(--cream);
          color: var(--chocolate-600);
          font-family: 'Nunito', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }

        .checklist-item-btn:hover {
          background: var(--cheese-50);
        }

        .checklist-item-btn.done {
          opacity: 0.7;
        }

        .checklist-item-btn.done .check-text {
          text-decoration: line-through;
          color: var(--chocolate-400);
        }

        .check-box {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid var(--chocolate-300);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 900;
          flex-shrink: 0;
          background: white;
        }

        .checklist-item-btn.done .check-box {
          background: var(--mint-400);
          border-color: var(--mint-400);
          color: white;
        }

        .checklist-more {
          text-align: right;
          font-size: 0.78rem;
          font-weight: 700;
          padding-top: 4px;
        }

        .checklist-more a {
          color: var(--chocolate-500);
          text-decoration: none;
        }

        /* TIER 3: Domain Overview */
        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0;
        }

        .section-more-link {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--chocolate-400);
          text-decoration: none;
        }

        .section-more-link:hover {
          color: var(--chocolate-600);
        }

        .dashboard-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .module-card {
          background: var(--color-surface);
          border-radius: 22px;
          padding: 18px;
          box-shadow: var(--shadow-xs);
          border: 1.5px solid var(--chocolate-100);
          text-decoration: none;
          color: var(--chocolate-600);
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          font-size: 1.6rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .module-title {
          font-size: 0.96rem;
          font-weight: 800;
          color: var(--chocolate-600);
          line-height: 1.2;
        }

        .module-subtitle {
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--chocolate-400);
        }

        .module-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 10px;
          background: var(--cream);
          border-radius: 14px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--chocolate-600);
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--chocolate-400);
          margin-top: 2px;
        }

        .stat-sub {
          font-size: 0.65rem;
          color: var(--chocolate-400);
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
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--chocolate-500);
        }

        .module-empty-hint {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--chocolate-400);
        }

        .text-danger { color: var(--peach-500); }

        .module-cta {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--chocolate-400);
          margin-top: auto;
        }

        .module-current-lesson {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--lavender-500);
          background: var(--lavender-50);
          padding: 6px 10px;
          border-radius: 10px;
        }

        .module-top-cat {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--mint-500);
          background: var(--mint-50);
          padding: 6px 10px;
          border-radius: 10px;
        }

        :global([data-theme='dark']) .hero-focus-card {
          background: linear-gradient(135deg, #2b241d 0%, #352b1f 100%);
          border-color: var(--cheese-500);
        }

        :global([data-theme='dark']) .hero-title {
          color: #fff5ec;
        }

        :global([data-theme='dark']) .hero-desc {
          color: #d9c8ba;
        }

        :global([data-theme='dark']) .hero-secondary-chip,
        :global([data-theme='dark']) .hero-context-pill,
        :global([data-theme='dark']) .status-pill {
          background: #332b25;
          color: #fff5ec;
          border-color: #4a3e36;
        }

        :global([data-theme='dark']) .checklist-item-btn {
          background: #332b25;
          border-color: #4a3e36;
          color: #fff5ec;
        }

        :global([data-theme='dark']) .module-card {
          background: #26201c;
          border-color: #4a3e36;
        }

        :global([data-theme='dark']) .module-stats {
          background: #332b25;
        }

        @media (max-width: 1024px) {
          .secondary-grid,
          .dashboard-cards {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .greeting-title { font-size: 1.2rem; }
          .hero-focus-card { padding: 18px; border-radius: 22px; }
          .hero-title { font-size: 1.15rem; }
        }
      `}</style>
    </div>
  )
}
