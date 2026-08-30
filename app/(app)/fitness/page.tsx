'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { fetchFitnessStats, type FitnessStats } from '@/lib/fitness-stats'
import { formatWeight, formatDuration, getPercent, EXERCISE_TYPES, getExerciseLabel, getExerciseIcon, INTENSITY_LABELS } from '@/lib/format'
import { formatDate, todayString, RollingPeriod } from '@/lib/date-utils'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

import { toast } from 'sonner'
import { awardXP } from '@/lib/gamification'
import { notifyDataChanged } from '@/lib/events'

function StatCard({ emoji, title, value, sub, color }: { emoji: string; title: string; value: React.ReactNode; sub?: string; color: string }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="stat-card-emoji">{emoji}</div>
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

function CalorieIntakeForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useUser()
  const [date, setDate] = useState(todayString())
  const [calories, setCalories] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cal = parseInt(calories, 10)
    if (!cal || isNaN(cal) || cal <= 0) {
      toast.error('Vui lòng nhập lượng calo hợp lệ (> 0 kcal)')
      return
    }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('calorie_intake_entries').insert({
      user_id: user.id,
      date,
      calories: cal,
      note: note.trim() || null,
    })

    if (error) {
      toast.error('Lỗi khi ghi nhận calo: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Đã ghi nhận calo nạp vào! 🥗')
    // Award XP safely with idempotent key
    await awardXP(user.id, 5, 'calorie_intake_logged', `calorie:${date}_${Date.now()}`)
    notifyDataChanged('fitness', 'intake')
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🥗 Ghi nhận calo nạp vào</h3>
          <button type="button" onClick={onClose} className="modal-close-btn">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="mochi-label">Ngày ghi *</label>
            <input
              type="date"
              className="mochi-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="mochi-label">Lượng calo (kcal) *</label>
            <input
              type="number"
              className="mochi-input"
              placeholder="ví dụ: 650"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              min="1"
              max="10000"
              required
            />
          </div>
          <div className="form-group">
            <label className="mochi-label">Ghi chú món ăn / bữa ăn (tùy chọn)</label>
            <input
              type="text"
              className="mochi-input"
              placeholder="ví dụ: Cơm tấm sườn bì, Phở bò, Sinh tố..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu calo nạp'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .modal-card { background: white; border-radius: 20px; width: 100%; max-width: 440px; padding: 24px; box-shadow: var(--shadow-lg); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .modal-header h3 { font-size: 1.15rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close-btn { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--chocolate-400); }
        .modal-body { display: flex; flex-direction: column; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
      `}</style>
    </div>
  )
}

export default function FitnessOverviewPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FitnessStats | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<RollingPeriod>('30d')
  const [appliedPeriod, setAppliedPeriod] = useState<RollingPeriod>('30d')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showIntakeModal, setShowIntakeModal] = useState(false)

  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setErrorMsg(null)
    setStats(null) // Hide old period data while loading new period
    const supabase = createClient()
    try {
      const res = await fetchFitnessStats(supabase, user.id, selectedPeriod)
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setStats(res)
      setAppliedPeriod(selectedPeriod)
      if (res.error) {
        setErrorMsg('Lỗi khi tải dữ liệu thể thao: ' + res.error)
      }
    } catch (err: any) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      console.error('Failed to load fitness stats:', err)
      setErrorMsg('Không thể kết nối để lấy dữ liệu thể thao.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [user, selectedPeriod])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  useDataChanged('fitness', loadData)

  const weightGoal = stats?.weightGoal ?? null
  const fitnessGoal = stats?.fitnessGoal ?? null
  const weightLogs = stats?.weightLogs ?? []
  const exerciseLogs = stats?.exerciseLogs ?? []
  const latestWeight = stats?.latestWeight ?? null
  const weightChange = stats?.weightChange ?? null

  // Chart data for weight (sorted ascending by log_date)
  const weightChartData = weightLogs.map(w => ({
    date: format(parseISO(w.log_date), 'd/M', { locale: vi }),
    weight: w.weight,
    target: weightGoal?.target_weight,
  }))

  // Exercise chart data (calories by day)
  const exByDay: Record<string, number> = {}
  exerciseLogs.forEach(e => {
    const d = format(parseISO(e.log_date), 'd/M', { locale: vi })
    exByDay[d] = (exByDay[d] ?? 0) + (e.calories_burned ?? 0)
  })
  const exChartData = Object.entries(exByDay).map(([date, calories]) => ({ date, calories })).reverse()

  const weightProgress = stats?.weightProgress ?? 0

  if (loading && !stats) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="mochi-skeleton" style={{ height: 160, borderRadius: 24 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💪 Giảm cân & Luyện tập</h1>
          <p className="page-subtitle">Theo dõi hành trình của bạn</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowIntakeModal(true)} className="mochi-btn mochi-btn-secondary mochi-btn-sm">🥗 Ghi calo nạp</button>
          <Link href="/fitness/weight?action=add" className="mochi-btn mochi-btn-secondary mochi-btn-sm">⚖️ Ghi cân</Link>
          <Link href="/fitness/exercise?action=add" className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm buổi tập</Link>
        </div>
      </div>

      {showIntakeModal && (
        <CalorieIntakeForm onClose={() => setShowIntakeModal(false)} onSaved={loadData} />
      )}

      {errorMsg && (
        <div style={{ background: '#FFF4F0', border: '1.5px solid var(--peach-300)', padding: '12px 16px', borderRadius: 16, color: 'var(--peach-600)', fontWeight: 700, fontSize: '0.85rem', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMsg}</span>
          <button className="mochi-btn mochi-btn-sm mochi-btn-secondary" onClick={loadData}>Thử lại</button>
        </div>
      )}

      {/* Period filter */}
      <div className="period-filter">
        {(['7d', '30d', '3m', 'all'] as const).map(p => (
          <button
            key={p}
            type="button"
            aria-pressed={selectedPeriod === p}
            className={`period-btn ${selectedPeriod === p ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(p)}
          >
            {p === '7d' ? '7 ngày' : p === '30d' ? '30 ngày' : p === '3m' ? '3 tháng' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div className="stats-grid">
        <StatCard
          emoji="⚖️"
          title="Cân nặng hiện tại"
          value={latestWeight ? `${latestWeight.weight} kg` : '–'}
          sub={weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg so với lần trước` : undefined}
          color="#FF7A5C"
        />
        <StatCard
          emoji="🔥"
          title="Calo tiêu hao"
          value={`${stats?.todayCalories ?? 0} kcal`}
          sub={(stats?.todayMinutes ?? 0) > 0 ? `${stats?.todayMinutes} phút tập hôm nay` : 'Chưa tập hôm nay'}
          color="#8F71F5"
        />
        <StatCard
          emoji="🥗"
          title="Calo nạp vào"
          value={`${stats?.todayIntakeCalories ?? 0} kcal`}
          sub={`Tổng kỳ: ${stats?.periodIntakeCalories ?? 0} kcal`}
          color="#3BB88E"
        />
        <StatCard
          emoji="⚡"
          title="Cân bằng calo"
          value={stats ? `${stats.calorieBalance > 0 ? `+${stats.calorieBalance}` : stats.calorieBalance} kcal` : '–'}
          sub="Nạp vào − Tiêu hao"
          color="#FFCA1A"
        />
      </div>

      {/* Weight progress */}
      {weightGoal && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-section-title">Tiến độ giảm cân</h3>
          <div className="weight-progress-bar">
            <div className="wp-start">{weightGoal.starting_weight} kg</div>
            <div className="wp-bar">
              <div className="mochi-progress">
                <div className="mochi-progress-bar fitness" style={{ width: `${weightProgress}%` }} />
              </div>
              <div className="wp-pct">{weightProgress}%</div>
            </div>
            <div className="wp-end">{weightGoal.target_weight} kg</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {weightLogs.length > 1 && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-section-title">📈 Biểu đồ cân nặng</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B8997A' }} />
              <YAxis tick={{ fontSize: 11, fill: '#B8997A' }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }}
                formatter={(v: any) => [`${v} kg`, 'Cân nặng']}
              />
              <Line type="monotone" dataKey="weight" stroke="#FF7A5C" strokeWidth={2.5} dot={{ fill: '#FF7A5C', r: 4 }} name="Cân nặng" />
              <Line type="monotone" dataKey="target" stroke="#3BB88E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Mục tiêu" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {exChartData.length > 0 && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-section-title">🔥 Calo tiêu hao</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={exChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B8997A' }} />
              <YAxis tick={{ fontSize: 11, fill: '#B8997A' }} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }}
                formatter={(v: any) => [`${v} kcal`, 'Calo']}
              />
              <Bar dataKey="calories" fill="#FF9A80" radius={[6, 6, 0, 0]} name="Calo" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick links */}
      <div className="nav-cards">
        <Link href="/fitness/weight" className="nav-card">
          <span className="nav-card-emoji">⚖️</span>
          <span className="nav-card-title">Nhật ký cân nặng</span>
          <span className="nav-card-count">{weightLogs.length} bản ghi</span>
        </Link>
        <Link href="/fitness/exercise" className="nav-card">
          <span className="nav-card-emoji">🏃</span>
          <span className="nav-card-title">Nhật ký luyện tập</span>
          <span className="nav-card-count">{exerciseLogs.length} buổi tập</span>
        </Link>
        <Link href="/fitness/stats" className="nav-card">
          <span className="nav-card-emoji">📊</span>
          <span className="nav-card-title">Thống kê chi tiết</span>
          <span className="nav-card-count">Xem báo cáo</span>
        </Link>
        <Link href="/fitness/goals" className="nav-card">
          <span className="nav-card-emoji">🎯</span>
          <span className="nav-card-title">Mục tiêu luyện tập</span>
          <span className="nav-card-count">{fitnessGoal?.weekly_sessions ?? 0} buổi/tuần</span>
        </Link>
      </div>

      {/* Recent exercise */}
      {exerciseLogs.length > 0 && (
        <div className="mochi-card" style={{ padding: 20 }}>
          <div className="card-header-row">
            <h3 className="card-section-title">Buổi tập gần đây</h3>
            <Link href="/fitness/exercise" className="view-all-link">Xem tất cả</Link>
          </div>
          <div className="exercise-list">
            {exerciseLogs.slice(0, 5).map(ex => (
              <div key={ex.id} className="exercise-item">
                <span className="ex-icon">{getExerciseIcon(ex.exercise_type)}</span>
                <div className="ex-info">
                  <div className="ex-name">{getExerciseLabel(ex.exercise_type)}</div>
                  <div className="ex-meta">{formatDate(ex.log_date)} · {ex.duration_minutes} phút</div>
                </div>
                <div className="ex-cal">
                  {ex.calories_burned ? `${ex.calories_burned} kcal` : '–'}
                  {ex.calories_is_estimate && ex.calories_burned && (
                    <span className="estimate-tag">ước tính</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {exerciseLogs.length === 0 && !loading && (
        <div className="mochi-empty-state">
          <div className="mascot">😿</div>
          <h3>Chưa có dữ liệu luyện tập</h3>
          <p>Hãy thêm buổi tập đầu tiên của bạn nhé!</p>
          <Link href="/fitness/exercise?action=add" className="mochi-btn mochi-btn-primary">+ Thêm buổi tập</Link>
        </div>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .page-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }

        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .period-filter {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .period-btn {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1.5px solid var(--chocolate-200);
          background: white;
          color: var(--chocolate-500);
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Nunito', sans-serif;
        }

        .period-btn.active {
          background: var(--peach-400);
          border-color: var(--peach-400);
          color: white;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card {
          background: white;
          border-radius: 20px;
          padding: 16px;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--chocolate-100);
          text-align: center;
          transition: transform 0.15s;
        }

        .stat-card:hover { transform: translateY(-2px); }

        .stat-card-emoji { font-size: 1.5rem; margin-bottom: 6px; }
        .stat-card-title { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-bottom: 6px; }
        .stat-card-value { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); }
        .stat-card-sub { font-size: 0.7rem; font-weight: 600; color: var(--chocolate-300); margin-top: 2px; }

        .card-section-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .card-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .view-all-link { font-size: 0.8rem; font-weight: 700; color: var(--cheese-500); text-decoration: none; }

        .weight-progress-bar { display: flex; align-items: center; gap: 12px; }
        .wp-start, .wp-end { font-size: 0.8rem; font-weight: 700; color: var(--chocolate-400); white-space: nowrap; }
        .wp-bar { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .wp-pct { font-size: 0.78rem; font-weight: 700; color: var(--peach-400); text-align: center; }

        .nav-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .nav-card {
          background: white;
          border-radius: 18px;
          padding: 16px;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--chocolate-100);
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
          text-align: center;
        }

        .nav-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .nav-card-emoji { font-size: 1.6rem; }
        .nav-card-title { font-size: 0.78rem; font-weight: 700; color: var(--chocolate-600); line-height: 1.3; }
        .nav-card-count { font-size: 0.7rem; font-weight: 600; color: var(--chocolate-300); }

        .exercise-list { display: flex; flex-direction: column; gap: 10px; }

        .exercise-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--chocolate-100);
        }

        .exercise-item:last-child { border-bottom: none; }
        .ex-icon { font-size: 1.4rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--peach-50); border-radius: 12px; flex-shrink: 0; }
        .ex-info { flex: 1; min-width: 0; }
        .ex-name { font-weight: 700; font-size: 0.875rem; color: var(--chocolate-600); }
        .ex-meta { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; }
        .ex-cal { font-weight: 700; font-size: 0.875rem; color: var(--peach-400); text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .estimate-tag { font-size: 0.65rem; color: var(--chocolate-300); font-weight: 600; background: var(--cream); padding: 2px 6px; border-radius: 999px; }

        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .nav-cards { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .header-actions { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
