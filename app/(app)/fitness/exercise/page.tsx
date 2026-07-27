'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatDate, todayString } from '@/lib/date-utils'
import { getExerciseLabel, getExerciseIcon, EXERCISE_TYPES, INTENSITY_LABELS, estimateCalories } from '@/lib/format'
import type { ExerciseLog, FitnessGoal } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

function ExerciseForm({ onClose, onSaved, existing }: {
  onClose: () => void
  onSaved: () => void
  existing?: ExerciseLog
}) {
  const { user } = useUser()
  const [date, setDate] = useState(existing?.log_date ?? todayString())
  const [type, setType] = useState(existing?.exercise_type ?? 'walking')
  const [duration, setDuration] = useState(existing?.duration_minutes?.toString() ?? '')
  const [calories, setCalories] = useState(existing?.calories_burned?.toString() ?? '')
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'high'>(existing?.intensity ?? 'moderate')
  const [distance, setDistance] = useState(existing?.distance_km?.toString() ?? '')
  const [steps, setSteps] = useState(existing?.steps?.toString() ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)
  const [isEstimate, setIsEstimate] = useState(existing?.calories_is_estimate ?? true)

  // Auto-estimate calories when type/duration changes
  function handleDurationChange(val: string) {
    setDuration(val)
    if (isEstimate && val) {
      const est = estimateCalories(type, Number(val))
      setCalories(est.toString())
    }
  }

  function handleTypeChange(val: string) {
    setType(val)
    if (isEstimate && duration) {
      const est = estimateCalories(val, Number(duration))
      setCalories(est.toString())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!duration || Number(duration) <= 0) { toast.error('Vui lòng nhập thời gian tập'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      log_date: date,
      exercise_type: type,
      duration_minutes: Number(duration),
      calories_burned: calories ? Number(calories) : null,
      calories_is_estimate: isEstimate,
      intensity,
      distance_km: distance ? Number(distance) : null,
      steps: steps ? Number(steps) : null,
      note: note || null,
    }
    const { error } = existing
      ? await supabase.from('exercise_logs').update(payload).eq('id', existing.id)
      : await supabase.from('exercise_logs').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success(existing ? 'Đã cập nhật!' : `Buổi tập đã được lưu! 🎉 ${getExerciseIcon(type)}`)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa buổi tập' : 'Thêm buổi tập'} 🏃</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Ngày *</label>
              <input type="date" className="mochi-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="mochi-label">Thời gian (phút) *</label>
              <input type="number" className="mochi-input" placeholder="30" value={duration} onChange={e => handleDurationChange(e.target.value)} min="1" max="600" required />
            </div>
          </div>

          <div className="form-group">
            <label className="mochi-label">Loại bài tập *</label>
            <div className="exercise-type-grid">
              {Object.entries(EXERCISE_TYPES).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  className={`exercise-type-btn ${type === key ? 'selected' : ''}`}
                  onClick={() => handleTypeChange(key)}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="mochi-label">Cường độ</label>
            <div className="intensity-group">
              {(['light', 'moderate', 'high'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`intensity-btn ${intensity === lvl ? 'selected' : ''}`}
                  style={intensity === lvl ? { background: INTENSITY_LABELS[lvl].color, color: 'white', borderColor: INTENSITY_LABELS[lvl].color } : {}}
                  onClick={() => setIntensity(lvl)}
                >
                  {INTENSITY_LABELS[lvl].label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">
                Calo tiêu hao
                <span className="label-badge">{isEstimate ? 'Ước tính' : 'Thực tế'}</span>
              </label>
              <div className="calories-input-wrap">
                <input type="number" className="mochi-input" placeholder="150" value={calories} onChange={e => setCalories(e.target.value)} min="0" />
                <label className="estimate-toggle">
                  <input type="checkbox" checked={isEstimate} onChange={e => setIsEstimate(e.target.checked)} />
                  Ước tính
                </label>
              </div>
              {isEstimate && <span className="estimate-note">⚠️ Giá trị ước tính, không phải chính xác 100%</span>}
            </div>
            <div className="form-group">
              <label className="mochi-label">Quãng đường (km)</label>
              <input type="number" className="mochi-input" placeholder="5.0" value={distance} onChange={e => setDistance(e.target.value)} step="0.1" min="0" />
            </div>
          </div>

          <div className="form-group">
            <label className="mochi-label">Số bước</label>
            <input type="number" className="mochi-input" placeholder="8000" value={steps} onChange={e => setSteps(e.target.value)} min="0" />
          </div>

          <div className="form-group">
            <label className="mochi-label">Ghi chú</label>
            <textarea className="mochi-input" placeholder="Cảm giác hôm nay..." value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

function ExercisePageContent() {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add')
  const [editingLog, setEditingLog] = useState<ExerciseLog | undefined>()
  const [period, setPeriod] = useState<'7d' | '30d' | '3m'>('30d')

  useEffect(() => { if (user) loadData() }, [user, period])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const from = new Date(); from.setDate(from.getDate() - days)
    const [logsRes, goalRes] = await Promise.all([
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('log_date', from.toISOString().split('T')[0]).order('log_date', { ascending: false }),
      supabase.from('fitness_goals').select('*').eq('user_id', user.id).single(),
    ])
    setLogs(logsRes.data ?? [])
    setFitnessGoal(goalRes.data)
    setLoading(false)
  }

  async function deleteLog(id: string) {
    if (!confirm('Xóa buổi tập này?')) return
    const supabase = createClient()
    await supabase.from('exercise_logs').delete().eq('id', id)
    toast.success('Đã xóa')
    loadData()
  }

  function exportCSV() {
    const header = 'Ngày,Loại bài tập,Thời gian (phút),Calo,Cường độ,Quãng đường (km),Số bước,Ghi chú'
    const rows = logs.map(l =>
      `${formatDate(l.log_date)},${getExerciseLabel(l.exercise_type)},${l.duration_minutes},${l.calories_burned ?? ''},${l.intensity},${l.distance_km ?? ''},${l.steps ?? ''},"${l.note ?? ''}"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'luyen-tap.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất CSV!')
  }

  const totalCalories = logs.reduce((s, l) => s + (l.calories_burned ?? 0), 0)
  const totalMinutes = logs.reduce((s, l) => s + l.duration_minutes, 0)

  // Chart data
  const calByDay: Record<string, number> = {}
  logs.forEach(l => {
    const d = format(parseISO(l.log_date), 'dd/MM', { locale: vi })
    calByDay[d] = (calByDay[d] ?? 0) + (l.calories_burned ?? 0)
  })
  const chartData = Object.entries(calByDay).slice(-14).map(([date, calories]) => ({ date, calories }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏃 Nhật ký luyện tập</h1>
          <p className="page-subtitle">{logs.length} buổi tập · {totalMinutes} phút · {totalCalories} kcal</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 CSV</button>
          <button onClick={() => { setEditingLog(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
        </div>
      </div>

      <div className="period-filter">
        {(['7d', '30d', '3m'] as const).map(p => (
          <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === '7d' ? '7 ngày' : p === '30d' ? '30 ngày' : '3 tháng'}
          </button>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">🔥 Calo tiêu hao theo ngày</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B8997A' }} />
              <YAxis tick={{ fontSize: 10, fill: '#B8997A' }} />
              <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: number) => [`${v} kcal`]} />
              <Bar dataKey="calories" fill="#FF9A80" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 18 }} />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">😸</div>
          <h3>Chưa có buổi tập nào</h3>
          <p>Hãy bắt đầu luyện tập và ghi lại nhé!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>+ Thêm buổi tập</button>
        </div>
      ) : (
        <div className="logs-list">
          {logs.map(log => (
            <div key={log.id} className="log-item">
              <div className="log-icon">{getExerciseIcon(log.exercise_type)}</div>
              <div className="log-info">
                <div className="log-name">{getExerciseLabel(log.exercise_type)}</div>
                <div className="log-meta">
                  {formatDate(log.log_date)} · {log.duration_minutes} phút · {INTENSITY_LABELS[log.intensity].label}
                  {log.distance_km && ` · ${log.distance_km} km`}
                </div>
              </div>
              <div className="log-calories">
                {log.calories_burned ? `${log.calories_burned} kcal` : '–'}
                {log.calories_is_estimate && log.calories_burned && (
                  <span className="estimate-tag">ước tính</span>
                )}
              </div>
              <div className="log-actions">
                <button className="icon-btn" onClick={() => { setEditingLog(log); setShowForm(true) }}>✏️</button>
                <button className="icon-btn" onClick={() => deleteLog(log.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ExerciseForm
          onClose={() => { setShowForm(false); setEditingLog(undefined) }}
          onSaved={loadData}
          existing={editingLog}
        />
      )}

      <style jsx>{`
        .page { max-width: 800px; margin: 0 auto; padding-bottom: 32px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 8px; }
        .period-filter { display: flex; gap: 6px; margin-bottom: 16px; }
        .period-btn { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .period-btn.active { background: var(--peach-400); border-color: var(--peach-400); color: white; }
        .card-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .logs-list { display: flex; flex-direction: column; gap: 8px; }
        .log-item { background: white; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); }
        .log-icon { width: 44px; height: 44px; border-radius: 14px; background: var(--peach-50); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
        .log-info { flex: 1; min-width: 0; }
        .log-name { font-weight: 700; font-size: 0.9rem; color: var(--chocolate-600); }
        .log-meta { font-size: 0.75rem; color: var(--chocolate-400); font-weight: 600; margin-top: 2px; }
        .log-calories { font-weight: 800; font-size: 0.9rem; color: var(--peach-400); text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; white-space: nowrap; }
        .estimate-tag { font-size: 0.62rem; color: var(--chocolate-300); background: var(--cream); padding: 1px 6px; border-radius: 999px; font-weight: 600; }
        .log-actions { display: flex; gap: 4px; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.95rem; padding: 4px 6px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 520px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .exercise-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .exercise-type-btn { padding: 8px 6px; border-radius: 12px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-600); font-weight: 700; font-size: 0.72rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .exercise-type-btn.selected { background: var(--peach-100); border-color: var(--peach-400); color: var(--peach-500); }
        .exercise-type-btn span:first-child { font-size: 1.1rem; }
        .intensity-group { display: flex; gap: 8px; }
        .intensity-btn { flex: 1; padding: 8px; border-radius: 12px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .label-badge { margin-left: 8px; font-size: 0.65rem; background: var(--cheese-100); color: var(--chocolate-500); padding: 2px 8px; border-radius: 999px; font-weight: 700; }
        .calories-input-wrap { display: flex; align-items: center; gap: 8px; }
        .calories-input-wrap .mochi-input { flex: 1; }
        .estimate-toggle { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 700; color: var(--chocolate-500); cursor: pointer; white-space: nowrap; }
        .estimate-note { font-size: 0.72rem; color: var(--chocolate-300); font-weight: 600; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        @media (max-width: 480px) {
          .exercise-type-grid { grid-template-columns: repeat(3, 1fr); }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

export default function ExercisePage() {
  return <Suspense><ExercisePageContent /></Suspense>
}
