'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useDataChanged } from '@/hooks/use-data-changed'
import { notifyDataChanged } from '@/lib/events'
import { useMochiReaction } from '@/hooks/use-mochi-reaction'
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
  const { triggerReaction } = useMochiReaction()
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
  const [errors, setErrors] = useState<{ date?: string; duration?: string; calories?: string; distance?: string; steps?: string }>({})

  const formRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const hasScrolledRef = useRef(false)

  // Single-scroll behavior on mount
  useEffect(() => {
    if (!hasScrolledRef.current && formRef.current) {
      hasScrolledRef.current = true
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
        dateInputRef.current?.focus({ preventScroll: true })
      })
    }
  }, [])

  // Auto-estimate calories when duration, type, or intensity changes
  function updateAutoCalories(newType: string, newDuration: string, newIntensity: 'light' | 'moderate' | 'high') {
    if (isEstimate && newDuration && Number(newDuration) > 0) {
      const est = estimateCalories(newType, Number(newDuration), newIntensity)
      setCalories(est.toString())
    }
  }

  function handleDurationChange(val: string) {
    setDuration(val)
    if (errors.duration) setErrors(prev => ({ ...prev, duration: undefined }))
    updateAutoCalories(type, val, intensity)
  }

  function handleTypeChange(val: string) {
    setType(val)
    updateAutoCalories(val, duration, intensity)
  }

  function handleIntensityChange(val: 'light' | 'moderate' | 'high') {
    setIntensity(val)
    updateAutoCalories(type, duration, val)
  }

  function handleModeChange(estimateMode: boolean) {
    setIsEstimate(estimateMode)
    if (estimateMode && duration && Number(duration) > 0) {
      const est = estimateCalories(type, Number(duration), intensity)
      setCalories(est.toString())
    }
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!date) errs.date = 'Vui lòng chọn ngày tập'
    if (!duration || isNaN(Number(duration)) || Number(duration) <= 0 || !Number.isInteger(Number(duration))) {
      errs.duration = 'Thời gian tập phải là số nguyên dương (phút)'
    }
    if (calories && (isNaN(Number(calories)) || Number(calories) < 0)) {
      errs.calories = 'Calo không được là số âm'
    }
    if (distance && (isNaN(Number(distance)) || Number(distance) < 0)) {
      errs.distance = 'Quãng đường không được là số âm'
    }
    if (steps && (isNaN(Number(steps)) || Number(steps) < 0)) {
      errs.steps = 'Số bước không được là số âm'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error('Vui lòng kiểm tra lại các thông tin đã nhập')
      return
    }
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
      distance_km: distance && (type === 'walking' || type === 'running' || type === 'hiking' || type === 'cycling' || type === 'swimming') ? Number(distance) : null,
      steps: steps && (type === 'walking' || type === 'running' || type === 'hiking') ? Number(steps) : null,
      note: note || null,
    }

    const { error } = existing
      ? await supabase.from('exercise_logs').update(payload).eq('id', existing.id)
      : await supabase.from('exercise_logs').insert(payload)

    if (error) {
      toast.error('Không thể lưu buổi tập: ' + error.message)
      setLoading(false)
      return
    }

    toast.success(existing ? 'Cập nhật buổi tập thành công!' : `Đã thêm buổi tập thành công! 🎉 ${getExerciseIcon(type)}`)
    notifyDataChanged('fitness', 'exercise')
    // Fire Smart Reaction only on new logs (not edits)
    if (!existing) {
      triggerReaction('exercise_logged', { dedupKey: date, delayMs: 400 })
    }
    onSaved()
    onClose()
  }

  // Field visibility by exercise type
  const showDistance = ['walking', 'running', 'hiking', 'cycling', 'swimming'].includes(type)
  const showSteps = ['walking', 'running', 'hiking'].includes(type)

  return (
    <div ref={formRef} className="inline-form-card">
      <div className="inline-form-inner">
        <div className="inline-form-header">
          <h2>{existing ? 'Sửa buổi tập' : 'Thêm buổi tập'} 🏃</h2>
          <button type="button" onClick={onClose} className="inline-close-btn" title="Hủy">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="inline-form-body">
          {/* Row 1: Date & Duration */}
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Ngày tập *</label>
              <input
                ref={dateInputRef}
                type="date"
                className="mochi-input"
                value={date}
                onChange={e => {
                  setDate(e.target.value)
                  if (errors.date) setErrors(prev => ({ ...prev, date: undefined }))
                }}
                required
              />
              {errors.date && <span className="field-error-msg">{errors.date}</span>}
            </div>

            <div className="form-group">
              <label className="mochi-label">Thời gian (phút) *</label>
              <input
                type="number"
                className="mochi-input"
                placeholder="30"
                value={duration}
                onChange={e => handleDurationChange(e.target.value)}
                min="1"
                max="600"
                required
              />
              {errors.duration && <span className="field-error-msg">{errors.duration}</span>}
            </div>
          </div>

          {/* Exercise Type Cards */}
          <fieldset className="mochi-fieldset">
            <legend className="mochi-legend">Loại bài tập *</legend>
            <div className="exercise-type-grid">
              {Object.entries(EXERCISE_TYPES).map(([key, info]) => {
                const isSelected = type === key
                return (
                  <label key={key} className={`exercise-type-card ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exercise-type"
                      value={key}
                      checked={isSelected}
                      onChange={() => handleTypeChange(key)}
                      className="sr-only"
                    />
                    <span className="etc-icon">{info.icon}</span>
                    <span className="etc-label">{info.label}</span>
                    <span className="tc-check">{isSelected ? '✓' : ''}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {/* Intensity Cards */}
          <fieldset className="mochi-fieldset">
            <legend className="mochi-legend">Cường độ tập luyện *</legend>
            <div className="intensity-cards-grid">
              {(['light', 'moderate', 'high'] as const).map(lvl => {
                const isSelected = intensity === lvl
                const info = INTENSITY_LABELS[lvl]
                return (
                  <label key={lvl} className={`intensity-card selected-${lvl} ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exercise-intensity"
                      value={lvl}
                      checked={isSelected}
                      onChange={() => handleIntensityChange(lvl)}
                      className="sr-only"
                    />
                    <span>{info.label}</span>
                    <span className="tc-check">{isSelected ? '✓' : ''}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {/* Calorie Estimation Mode & Input */}
          <div className="form-group">
            <label className="mochi-label">
              Calo tiêu hao (kcal)
            </label>
            <div className="calorie-mode-grid">
              <label className={`calorie-mode-card ${isEstimate ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="calorie-mode"
                  checked={isEstimate}
                  onChange={() => handleModeChange(true)}
                  className="sr-only"
                />
                ✨ Ước tính tự động
              </label>

              <label className={`calorie-mode-card ${!isEstimate ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="calorie-mode"
                  checked={!isEstimate}
                  onChange={() => handleModeChange(false)}
                  className="sr-only"
                />
                ✍️ Tự nhập
              </label>
            </div>

            <input
              type="number"
              className="mochi-input"
              placeholder={isEstimate ? 'Tự động tính theo thời gian & loại bài tập' : 'Nhập lượng calo thực tế'}
              value={calories}
              onChange={e => {
                setCalories(e.target.value)
                if (errors.calories) setErrors(prev => ({ ...prev, calories: undefined }))
              }}
              min="0"
              readOnly={isEstimate}
              style={isEstimate ? { opacity: 0.85, cursor: 'not-allowed' } : {}}
            />
            {errors.calories && <span className="field-error-msg">{errors.calories}</span>}
            {isEstimate ? (
              <span className="estimate-note">💡 Giá trị tham khảo, lượng calo thực tế có thể khác.</span>
            ) : (
              <span className="estimate-note">✍️ Đang ở chế độ Calo tự nhập.</span>
            )}
          </div>

          {/* Dynamic Optional Fields */}
          {(showDistance || showSteps) && (
            <div className="form-row">
              {showDistance && (
                <div className="form-group">
                  <label className="mochi-label">Quãng đường (km)</label>
                  <input
                    type="number"
                    className="mochi-input"
                    placeholder="5.0"
                    value={distance}
                    onChange={e => {
                      setDistance(e.target.value)
                      if (errors.distance) setErrors(prev => ({ ...prev, distance: undefined }))
                    }}
                    step="0.1"
                    min="0"
                  />
                  {errors.distance && <span className="field-error-msg">{errors.distance}</span>}
                </div>
              )}

              {showSteps && (
                <div className="form-group">
                  <label className="mochi-label">Số bước</label>
                  <input
                    type="number"
                    className="mochi-input"
                    placeholder="8000"
                    value={steps}
                    onChange={e => {
                      setSteps(e.target.value)
                      if (errors.steps) setErrors(prev => ({ ...prev, steps: undefined }))
                    }}
                    min="0"
                  />
                  {errors.steps && <span className="field-error-msg">{errors.steps}</span>}
                </div>
              )}
            </div>
          )}

          {/* Note Field */}
          <div className="form-group">
            <label className="mochi-label">Ghi chú</label>
            <textarea
              className="mochi-input"
              placeholder="Ghi lại cảm nhận, thời tiết, trạng thái cơ thể..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Form Actions */}
          <div className="inline-form-footer">
            <button type="button" className="mochi-btn mochi-btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : existing ? 'Cập nhật buổi tập' : 'Lưu buổi tập'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .field-error-msg {
          font-size: 0.75rem;
          color: var(--peach-500);
          font-weight: 700;
          margin-top: 2px;
        }
        .estimate-note {
          font-size: 0.75rem;
          color: var(--chocolate-400);
          font-weight: 600;
          margin-top: 4px;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
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

  useDataChanged('fitness', loadData)

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const from = new Date(); from.setDate(from.getDate() - days)
    const [logsRes, goalRes] = await Promise.all([
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('log_date', from.toISOString().split('T')[0]).order('log_date', { ascending: false }),
      supabase.from('fitness_goals').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    setLogs(logsRes.data ?? [])
    setFitnessGoal(goalRes.data)
    setLoading(false)
  }

  async function deleteLog(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa buổi tập này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('exercise_logs').delete().eq('id', id)
    if (error) {
      toast.error('Không thể xóa buổi tập: ' + error.message)
      return
    }
    toast.success('Đã xóa buổi tập')
    notifyDataChanged('fitness', 'exercise')
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
    toast.success('Đã xuất dữ liệu CSV!')
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

  const isFormOpen = showForm || !!editingLog

  return (
    <div className="page">
      {/* 1. Header & Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🏃 Nhật ký luyện tập</h1>
          <p className="page-subtitle">{logs.length} buổi tập · {totalMinutes} phút · {totalCalories} kcal</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 CSV</button>
          {!isFormOpen && (
            <button onClick={() => { setEditingLog(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Thêm</button>
          )}
        </div>
      </div>

      {/* 2. Period Selector */}
      <div className="period-filter">
        {(['7d', '30d', '3m'] as const).map(p => (
          <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === '7d' ? '7 ngày' : p === '30d' ? '30 ngày' : '3 tháng'}
          </button>
        ))}
      </div>

      {/* 3. Summary Chart */}
      {chartData.length > 0 && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">🔥 Calo tiêu hao theo ngày</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B8997A' }} />
              <YAxis tick={{ fontSize: 10, fill: '#B8997A' }} />
              <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: any) => [`${v} kcal`]} />
              <Bar dataKey="calories" fill="#FF9A80" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 4. Inline Form when Open */}
      {isFormOpen && (
        <ExerciseForm
          onClose={() => { setShowForm(false); setEditingLog(undefined) }}
          onSaved={loadData}
          existing={editingLog}
        />
      )}

      {/* 5. Exercise History & Empty State (ONLY when form is CLOSED) */}
      {!isFormOpen && (
        <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="mochi-skeleton" style={{ height: 80, borderRadius: 18 }} />)}
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
                      {formatDate(log.log_date)} · {log.duration_minutes} phút · {INTENSITY_LABELS[log.intensity]?.label ?? log.intensity}
                      {log.distance_km && ` · ${log.distance_km} km`}
                      {log.steps && ` · ${log.steps} bước`}
                    </div>
                    {log.note && <div className="log-note">📝 {log.note}</div>}
                  </div>
                  <div className="log-calories">
                    {log.calories_burned ? `${log.calories_burned} kcal` : '–'}
                    {log.calories_is_estimate && log.calories_burned && (
                      <span className="estimate-tag">ước tính</span>
                    )}
                  </div>
                  <div className="log-actions">
                    <button className="icon-btn" title="Sửa" onClick={() => { setEditingLog(log); setShowForm(true) }}>✏️</button>
                    <button className="icon-btn" title="Xóa" onClick={() => deleteLog(log.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
        .log-note { font-size: 0.75rem; color: var(--chocolate-500); font-style: italic; margin-top: 2px; }
        .log-calories { font-weight: 800; font-size: 0.9rem; color: var(--peach-400); text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; white-space: nowrap; }
        .estimate-tag { font-size: 0.62rem; color: var(--chocolate-300); background: var(--cream); padding: 1px 6px; border-radius: 999px; font-weight: 600; }
        .log-actions { display: flex; gap: 4px; }
        .icon-btn { background: none; border: none; cursor: pointer; font-size: 0.95rem; padding: 4px 6px; border-radius: 8px; transition: background 0.15s; }
        .icon-btn:hover { background: var(--cream); }
      `}</style>
    </div>
  )
}

export default function ExercisePage() {
  return <Suspense><ExercisePageContent /></Suspense>
}
