'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { fetchFitnessStats, type FitnessStats } from '@/lib/fitness-stats'
import type { RollingPeriod } from '@/lib/date-utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

function FitnessStatsContent() {
  const { user } = useUser()
  const [period, setPeriod] = useState<RollingPeriod>('30d')
  const [stats, setStats] = useState<FitnessStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const result = await fetchFitnessStats(supabase, user.id, period)
    setStats(result)
    setLoading(false)
  }, [user, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDataChanged('fitness', loadData)

  const weightLogs = stats?.weightLogs ?? []
  const exerciseLogs = stats?.exerciseLogs ?? []
  const intakeEntries = stats?.calorieIntakeEntries ?? []

  // Prepare Weight chart data
  const weightChartData = weightLogs.map(w => {
    let dateLabel = w.log_date
    try {
      dateLabel = format(parseISO(w.log_date), 'd/M', { locale: vi })
    } catch {
      // fallback
    }
    return {
      date: dateLabel,
      weight: w.weight,
      target: stats?.targetWeight,
    }
  })

  // Prepare Calorie Bar Chart data (Grouped by date)
  const calorieMap: Record<string, { date: string; displayDate: string; burned: number; intake: number }> = {}
  exerciseLogs.forEach(ex => {
    if (!calorieMap[ex.log_date]) {
      let displayDate = ex.log_date
      try {
        displayDate = format(parseISO(ex.log_date), 'd/M', { locale: vi })
      } catch {}
      calorieMap[ex.log_date] = { date: ex.log_date, displayDate, burned: 0, intake: 0 }
    }
    calorieMap[ex.log_date].burned += ex.calories_burned ?? 0
  })

  intakeEntries.forEach(c => {
    if (!calorieMap[c.date]) {
      let displayDate = c.date
      try {
        displayDate = format(parseISO(c.date), 'd/M', { locale: vi })
      } catch {}
      calorieMap[c.date] = { date: c.date, displayDate, burned: 0, intake: 0 }
    }
    calorieMap[c.date].intake += c.calories ?? 0
  })

  const calorieChartData = Object.values(calorieMap).sort((a, b) => a.date.localeCompare(b.date))

  const periodLabels: Record<RollingPeriod, string> = {
    '7d': '7 ngày qua',
    '30d': '30 ngày qua',
    '3m': '3 tháng qua',
    'all': 'Toàn bộ thời gian',
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link href="/fitness" className="back-link">← Thể chất & Sức khỏe</Link>
          </div>
          <h1 className="page-title">📊 Thống kê chi tiết thể chất</h1>
          <p className="page-subtitle">{periodLabels[period] || 'Tổng quan dữ liệu sức khỏe'}</p>
        </div>
        <div className="header-actions">
          <Link href="/fitness/weight" className="mochi-btn mochi-btn-secondary mochi-btn-sm">⚖️ Cân nặng</Link>
          <Link href="/fitness/exercise" className="mochi-btn mochi-btn-secondary mochi-btn-sm">🏃 Luyện tập</Link>
        </div>
      </div>

      {/* Period filter buttons */}
      <div className="period-filter">
        {(['7d', '30d', '3m', 'all'] as const).map(p => (
          <button
            key={p}
            type="button"
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === '7d' ? '7 Ngày' : p === '30d' ? '30 Ngày' : p === '3m' ? '3 Tháng' : 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="mochi-skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⚖️</div>
              <div className="stat-content">
                <div className="stat-label">Cân nặng hiện tại</div>
                <div className="stat-value">
                  {stats?.latestWeight ? `${stats.latestWeight.weight} kg` : 'Chưa có'}
                </div>
                {stats?.weightChange !== null && stats?.weightChange !== undefined && (
                  <div className={`stat-sub ${stats.weightChange <= 0 ? 'good' : 'warn'}`}>
                    {stats.weightChange > 0 ? '+' : ''}
                    {stats.weightChange} kg so với lần trước
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-label">Calo tiêu hao</div>
                <div className="stat-value">{stats?.periodCalories ?? 0} kcal</div>
                <div className="stat-sub">{stats?.periodSessions ?? 0} buổi tập · {stats?.periodMinutes ?? 0} phút</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🥗</div>
              <div className="stat-content">
                <div className="stat-label">Calo nạp vào</div>
                <div className="stat-value">{stats?.periodIntakeCalories ?? 0} kcal</div>
                <div className="stat-sub">{intakeEntries.length} bữa ăn đã ghi</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <div className="stat-label">Cân bằng calo</div>
                <div className="stat-value">
                  {stats ? (stats.calorieBalance > 0 ? `+${stats.calorieBalance}` : `${stats.calorieBalance}`) : 0} kcal
                </div>
                <div className="stat-sub">Nạp vào − Tiêu hao</div>
              </div>
            </div>
          </div>

          {/* Weight Chart Section */}
          <div className="mochi-card chart-card">
            <div className="chart-header">
              <h3 className="card-title">📈 Xu hướng cân nặng</h3>
              {stats?.targetWeight && (
                <span className="target-badge">Mục tiêu: {stats.targetWeight} kg</span>
              )}
            </div>

            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={weightChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B8997A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#B8997A' }} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }}
                    formatter={(v: any) => [`${v} kg`, 'Cân nặng']}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#FF7A5C" strokeWidth={3} dot={{ fill: '#FF7A5C', r: 4 }} />
                  {stats?.targetWeight && (
                    <Line type="monotone" dataKey="target" stroke="#3BB88E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Mục tiêu" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <span className="empty-emoji">⚖️</span>
                <p>Cần ít nhất 2 lần ghi nhận cân nặng để hiển thị biểu đồ xu hướng.</p>
                <Link href="/fitness/weight?action=add" className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Ghi cân nặng</Link>
              </div>
            )}
          </div>

          {/* Calorie Intake vs Burned Chart Section */}
          <div className="mochi-card chart-card">
            <div className="chart-header">
              <h3 className="card-title">🔥 Calo tiêu hao & 🥗 Calo nạp vào</h3>
            </div>

            {calorieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={calorieChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#B8997A' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#B8997A' }} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }}
                    formatter={(v: any, name: any) => [`${v} kcal`, name === 'burned' ? 'Tiêu hao' : 'Nạp vào']}
                  />
                  <Legend formatter={(val) => (val === 'burned' ? '🔥 Tiêu hao' : '🥗 Nạp vào')} />
                  <Bar dataKey="burned" fill="#FF7A5C" radius={[4, 4, 0, 0]} name="burned" />
                  <Bar dataKey="intake" fill="#3BB88E" radius={[4, 4, 0, 0]} name="intake" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <span className="empty-emoji">🏃</span>
                <p>Chưa có dữ liệu luyện tập hoặc ăn uống trong khoảng thời gian này.</p>
                <Link href="/fitness/exercise?action=add" className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm bài tập</Link>
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .page { max-width: 860px; margin: 0 auto; padding-bottom: 40px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .breadcrumb { margin-bottom: 4px; }
        .back-link { font-size: 0.82rem; font-weight: 700; color: var(--chocolate-400); text-decoration: none; transition: color 0.15s; }
        .back-link:hover { color: var(--peach-400); }
        .page-title { font-size: 1.45rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.88rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; }
        .period-filter { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
        .period-btn { padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .period-btn.active { background: var(--peach-400); border-color: var(--peach-400); color: white; }
        .loading-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: 18px; padding: 14px 16px; border: 1.5px solid var(--chocolate-100); display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-xs); }
        .stat-icon { font-size: 1.8rem; line-height: 1; }
        .stat-content { flex: 1; min-width: 0; }
        .stat-label { font-size: 0.75rem; font-weight: 700; color: var(--chocolate-400); margin-bottom: 2px; }
        .stat-value { font-size: 1.25rem; font-weight: 800; color: var(--chocolate-600); }
        .stat-sub { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-top: 2px; }
        .stat-sub.good { color: var(--mint-400); }
        .stat-sub.warn { color: var(--peach-400); }
        .chart-card { padding: 20px; margin-bottom: 20px; }
        .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .card-title { font-size: 1rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .target-badge { font-size: 0.78rem; font-weight: 700; color: var(--mint-500); background: var(--mint-50); padding: 4px 10px; border-radius: 999px; }
        .chart-empty { padding: 36px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--chocolate-400); font-weight: 600; font-size: 0.9rem; }
        .empty-emoji { font-size: 2.2rem; }
        @media (max-width: 768px) {
          .stats-grid, .loading-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .stats-grid, .loading-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

export default function FitnessStatsPage() {
  return (
    <Suspense>
      <FitnessStatsContent />
    </Suspense>
  )
}
