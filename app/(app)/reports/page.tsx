'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { formatVNDCompact, getExerciseLabel } from '@/lib/format'
import { formatDate } from '@/lib/date-utils'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, parseISO, subDays, subMonths } from 'date-fns'
import { vi } from 'date-fns/locale'

const COLORS = ['#FF7A5C', '#FFCA1A', '#3BB88E', '#8F71F5', '#FF9A80', '#5ECFAA', '#A990FF', '#FFD84D']

type Period = '7d' | '30d' | '3m' | '6m' | '1y'

export default function ReportsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const [activeTab, setActiveTab] = useState<'fitness' | 'study' | 'expense' | 'overview'>('overview')

  // Data state
  const [weightData, setWeightData] = useState<any[]>([])
  const [exerciseData, setExerciseData] = useState<any[]>([])
  const [studyData, setStudyData] = useState<any[]>([])
  const [expenseData, setExpenseData] = useState<any[]>([])
  const [catData, setCatData] = useState<any[]>([])

  // Summary stats
  const [totalExerciseDays, setTotalExerciseDays] = useState(0)
  const [totalExerciseMinutes, setTotalExerciseMinutes] = useState(0)
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0)
  const [totalNewWords, setTotalNewWords] = useState(0)
  const [totalStudyDays, setTotalStudyDays] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)

  useEffect(() => { if (user) loadData() }, [user, period])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '3m' ? 90 : period === '6m' ? 180 : 365
    const from = subDays(new Date(), days)
    const fromStr = from.toISOString().split('T')[0]

    const [wLogs, exLogs, studySessions, transactions] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('user_id', user.id).gte('log_date', fromStr).order('log_date'),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('log_date', fromStr).order('log_date'),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('session_date', fromStr).order('session_date'),
      supabase.from('transactions').select('*, category:expense_categories(name, icon, color)').eq('user_id', user.id).gte('transaction_date', fromStr).order('transaction_date'),
    ])

    // Weight chart
    const wChartData = (wLogs.data ?? []).map((w: any) => ({
      date: format(parseISO(w.log_date), 'd/M', { locale: vi }),
      weight: w.weight,
    }))
    setWeightData(wChartData)

    // Exercise aggregated by day
    const exByDay: Record<string, { date: string; calories: number; minutes: number; sessions: number }> = {}
    ;(exLogs.data ?? []).forEach((e: any) => {
      const d = format(parseISO(e.log_date), 'd/M', { locale: vi })
      if (!exByDay[d]) exByDay[d] = { date: d, calories: 0, minutes: 0, sessions: 0 }
      exByDay[d].calories += (e.calories_burned ?? 0)
      exByDay[d].minutes += e.duration_minutes
      exByDay[d].sessions += 1
    })
    const exChartData = Object.values(exByDay)
    setExerciseData(exChartData)

    // Study data
    const studyChartData = (studySessions.data ?? []).map((s: any) => ({
      date: format(parseISO(s.session_date), 'd/M', { locale: vi }),
      newWords: s.new_words_count,
      reviewWords: s.reviewed_words_count,
      minutes: s.duration_minutes,
    }))
    setStudyData(studyChartData)

    // Expense by day
    const expByDay: Record<string, { date: string; expense: number; income: number }> = {}
    ;(transactions.data ?? []).forEach((t: any) => {
      const d = format(parseISO(t.transaction_date), 'd/M', { locale: vi })
      if (!expByDay[d]) expByDay[d] = { date: d, expense: 0, income: 0 }
      if (t.type === 'expense') expByDay[d].expense += t.amount
      else expByDay[d].income += t.amount
    })
    setExpenseData(Object.values(expByDay))

    // Expense by category
    const catMap: Record<string, { name: string; amount: number; icon: string }> = {}
    ;(transactions.data ?? []).filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const cat = t.category as any
      const key = cat?.name ?? 'Khác'
      if (!catMap[key]) catMap[key] = { name: key, amount: 0, icon: cat?.icon ?? '⭐' }
      catMap[key].amount += t.amount
    })
    setCatData(Object.values(catMap).sort((a, b) => b.amount - a.amount).slice(0, 8))

    // Summary stats
    const exData: any[] = exLogs.data ?? []
    setTotalExerciseDays(new Set(exData.map((e: any) => e.log_date)).size)
    setTotalExerciseMinutes(exData.reduce((s: number, e: any) => s + e.duration_minutes, 0))
    setTotalCaloriesBurned(exData.reduce((s: number, e: any) => s + (e.calories_burned ?? 0), 0))

    const sessions: any[] = studySessions.data ?? []
    setTotalStudyDays(new Set(sessions.map((s: any) => s.session_date)).size)
    setTotalNewWords(sessions.reduce((s: number, x: any) => s + x.new_words_count, 0))

    const txData: any[] = transactions.data ?? []
    setTotalExpense(txData.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0))
    setTotalIncome(txData.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0))

    setLoading(false)
  }

  const periodLabel = period === '7d' ? '7 ngày' : period === '30d' ? '30 ngày' : period === '3m' ? '3 tháng' : period === '6m' ? '6 tháng' : '1 năm'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Báo cáo tổng hợp</h1>
          <p className="page-subtitle">Xem lại hành trình {periodLabel} của bạn</p>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <div className="tabs">
          {(['overview', 'fitness', 'study', 'expense'] as const).map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' ? '🏠 Tổng quan' : tab === 'fitness' ? '💪 Thể lực' : tab === 'study' ? '📚 Học tập' : '💰 Chi tiêu'}
            </button>
          ))}
        </div>
        <div className="period-filter">
          {(['7d', '30d', '3m', '6m', '1y'] as const).map(p => (
            <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p === '7d' ? '7N' : p === '30d' ? '30N' : p === '3m' ? '3T' : p === '6m' ? '6T' : '1N'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="overview-grid">
            <div className="overview-card fitness">
              <h3>💪 Thể lực</h3>
              <div className="ov-stats">
                <div className="ov-stat"><div className="ov-val">{totalExerciseDays}</div><div className="ov-label">ngày tập</div></div>
                <div className="ov-stat"><div className="ov-val">{totalExerciseMinutes}</div><div className="ov-label">phút</div></div>
                <div className="ov-stat"><div className="ov-val">{totalCaloriesBurned}</div><div className="ov-label">kcal</div></div>
              </div>
            </div>
            <div className="overview-card study">
              <h3>📚 Học tập</h3>
              <div className="ov-stats">
                <div className="ov-stat"><div className="ov-val">{totalStudyDays}</div><div className="ov-label">ngày học</div></div>
                <div className="ov-stat"><div className="ov-val">{totalNewWords}</div><div className="ov-label">từ mới</div></div>
              </div>
            </div>
            <div className="overview-card expense">
              <h3>💰 Chi tiêu</h3>
              <div className="ov-stats">
                <div className="ov-stat"><div className="ov-val">{formatVNDCompact(totalExpense)}</div><div className="ov-label">tổng chi</div></div>
                <div className="ov-stat"><div className="ov-val">{formatVNDCompact(totalIncome)}</div><div className="ov-label">tổng thu</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fitness reports */}
      {activeTab === 'fitness' && (
        <div className="charts-section">
          {weightData.length > 1 && (
            <div className="mochi-card" style={{ padding: 20 }}>
              <h3 className="chart-title">⚖️ Cân nặng theo thời gian</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B8997A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#B8997A' }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: any) => [`${v} kg`, 'Cân nặng']} />
                  <Line type="monotone" dataKey="weight" stroke="#FF7A5C" strokeWidth={2.5} dot={{ fill: '#FF7A5C', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {exerciseData.length > 0 && (
            <div className="mochi-card" style={{ padding: 20 }}>
              <h3 className="chart-title">🔥 Calo tiêu hao</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={exerciseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B8997A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#B8997A' }} />
                  <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: any) => [`${v} kcal`]} />
                  <Bar dataKey="calories" fill="#FF9A80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="summary-stats-grid">
            <div className="sum-stat"><div className="ss-val">{totalExerciseDays}</div><div className="ss-label">Ngày tập</div></div>
            <div className="sum-stat"><div className="ss-val">{totalExerciseMinutes}</div><div className="ss-label">Tổng phút</div></div>
            <div className="sum-stat"><div className="ss-val">{totalCaloriesBurned}</div><div className="ss-label">Calo tiêu hao</div></div>
            <div className="sum-stat"><div className="ss-val">{totalExerciseDays > 0 ? Math.round(totalExerciseMinutes / totalExerciseDays) : 0}</div><div className="ss-label">TB phút/buổi</div></div>
          </div>
        </div>
      )}

      {/* Study reports */}
      {activeTab === 'study' && (
        <div className="charts-section">
          {studyData.length > 0 && (
            <div className="mochi-card" style={{ padding: 20 }}>
              <h3 className="chart-title">📖 Từ mới học mỗi ngày</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={studyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B8997A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#B8997A' }} />
                  <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} />
                  <Bar dataKey="newWords" fill="#8F71F5" radius={[4, 4, 0, 0]} name="Từ mới" />
                  <Bar dataKey="reviewWords" fill="#C0ADFF" radius={[4, 4, 0, 0]} name="Từ ôn" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="summary-stats-grid">
            <div className="sum-stat"><div className="ss-val">{totalStudyDays}</div><div className="ss-label">Ngày học</div></div>
            <div className="sum-stat"><div className="ss-val">{totalNewWords}</div><div className="ss-label">Từ mới</div></div>
          </div>
        </div>
      )}

      {/* Expense reports */}
      {activeTab === 'expense' && (
        <div className="charts-section">
          {expenseData.length > 0 && (
            <div className="mochi-card" style={{ padding: 20 }}>
              <h3 className="chart-title">💰 Thu chi theo ngày</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={expenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B8997A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#B8997A' }} tickFormatter={v => formatVNDCompact(v)} />
                  <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: any) => [formatVNDCompact(Number(v))]} />
                  <Bar dataKey="expense" fill="#FF9A80" radius={[4, 4, 0, 0]} name="Chi" />
                  <Bar dataKey="income" fill="#5ECFAA" radius={[4, 4, 0, 0]} name="Thu" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {catData.length > 0 && (
            <div className="mochi-card" style={{ padding: 20 }}>
              <h3 className="chart-title">🥧 Chi tiêu theo danh mục</h3>
              <div className="pie-section">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={catData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [formatVNDCompact(Number(v))]} contentStyle={{ fontFamily: 'Nunito', borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {catData.map((cat, i) => (
                    <div key={cat.name} className="legend-item">
                      <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="legend-name">{cat.icon} {cat.name}</span>
                      <span className="legend-val">{formatVNDCompact(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="summary-stats-grid">
            <div className="sum-stat"><div className="ss-val expense-val">{formatVNDCompact(totalExpense)}</div><div className="ss-label">Tổng chi</div></div>
            <div className="sum-stat"><div className="ss-val income-val">{formatVNDCompact(totalIncome)}</div><div className="ss-label">Tổng thu</div></div>
            <div className="sum-stat"><div className={`ss-val ${totalIncome - totalExpense >= 0 ? 'income-val' : 'expense-val'}`}>{formatVNDCompact(totalIncome - totalExpense)}</div><div className="ss-label">Số dư</div></div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="mochi-skeleton" style={{ height: 200, borderRadius: 24 }} />)}
        </div>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .controls-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .tab-btn { padding: 8px 14px; border-radius: 14px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .tab-btn.active { background: var(--cheese-400); border-color: var(--cheese-400); color: var(--chocolate-700); }
        .period-filter { display: flex; gap: 4px; margin-left: auto; }
        .period-btn { padding: 6px 10px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .period-btn.active { background: var(--chocolate-500); border-color: var(--chocolate-500); color: white; }
        .charts-section { display: flex; flex-direction: column; gap: 16px; }
        .chart-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .overview-section { display: flex; flex-direction: column; gap: 16px; }
        .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .overview-card { background: white; border-radius: 24px; padding: 20px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); }
        .overview-card h3 { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .overview-card.fitness { border-top: 3px solid var(--peach-400); }
        .overview-card.study { border-top: 3px solid var(--lavender-400); }
        .overview-card.expense { border-top: 3px solid var(--mint-400); }
        .ov-stats { display: flex; gap: 16px; flex-wrap: wrap; }
        .ov-stat { text-align: center; flex: 1; }
        .ov-val { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); }
        .ov-label { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-top: 2px; }
        .summary-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .sum-stat { background: white; border-radius: 16px; padding: 14px; text-align: center; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); }
        .ss-val { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); }
        .ss-label { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-top: 4px; }
        .expense-val { color: var(--peach-400); }
        .income-val { color: var(--mint-400); }
        .pie-section { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .pie-legend { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 8px; }
        .legend-item { display: flex; align-items: center; gap: 8px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .legend-name { flex: 1; font-size: 0.8rem; font-weight: 700; color: var(--chocolate-600); }
        .legend-val { font-size: 0.78rem; font-weight: 800; color: var(--chocolate-500); }
        @media (max-width: 768px) {
          .overview-grid { grid-template-columns: 1fr; }
          .summary-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .period-filter { margin-left: 0; }
        }
      `}</style>
    </div>
  )
}
