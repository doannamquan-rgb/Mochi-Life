'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { formatDate, todayString } from '@/lib/date-utils'
import type { WeightLog, WeightGoal } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

function WeightForm({ onClose, onSaved, existing }: {
  onClose: () => void
  onSaved: () => void
  existing?: WeightLog
}) {
  const { user } = useUser()
  const [date, setDate] = useState(existing?.log_date ?? todayString())
  const [weight, setWeight] = useState(existing?.weight?.toString() ?? '')
  const [waist, setWaist] = useState(existing?.waist_cm?.toString() ?? '')
  const [hip, setHip] = useState(existing?.hip_cm?.toString() ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weight || isNaN(Number(weight))) { toast.error('Vui lòng nhập cân nặng hợp lệ'); return }
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      log_date: date,
      weight: Number(weight),
      waist_cm: waist ? Number(waist) : null,
      hip_cm: hip ? Number(hip) : null,
      note: note || null,
    }
    const { error } = existing
      ? await supabase.from('weight_logs').update(payload).eq('id', existing.id)
      : await supabase.from('weight_logs').upsert(payload, { onConflict: 'user_id,log_date' })

    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }

    // Update current_weight in weight_goals
    await supabase.from('weight_goals').update({ current_weight: Number(weight) }).eq('user_id', user.id)

    toast.success(existing ? 'Đã cập nhật!' : 'Đã lưu cân nặng! 🎉')
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? 'Sửa bản ghi' : 'Ghi cân nặng'} ⚖️</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Ngày *</label>
              <input type="date" className="mochi-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="mochi-label">Cân nặng (kg) *</label>
              <input type="number" className="mochi-input" placeholder="60.5" value={weight} onChange={e => setWeight(e.target.value)} step="0.1" min="20" max="300" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="mochi-label">Vòng eo (cm)</label>
              <input type="number" className="mochi-input" placeholder="70" value={waist} onChange={e => setWaist(e.target.value)} step="0.5" min="30" max="200" />
            </div>
            <div className="form-group">
              <label className="mochi-label">Vòng hông (cm)</label>
              <input type="number" className="mochi-input" placeholder="90" value={hip} onChange={e => setHip(e.target.value)} step="0.5" min="50" max="200" />
            </div>
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

function WeightPageContent() {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [goal, setGoal] = useState<WeightGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('action') === 'add')
  const [editingLog, setEditingLog] = useState<WeightLog | undefined>()
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'all'>('30d')

  useEffect(() => { if (user) loadData() }, [user, period])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from('weight_logs').select('*').eq('user_id', user.id).order('log_date')
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '3m' ? 90 : period === '6m' ? 180 : 365
      const from = new Date(); from.setDate(from.getDate() - days)
      query = query.gte('log_date', from.toISOString().split('T')[0])
    }
    const [logsRes, goalRes] = await Promise.all([query, supabase.from('weight_goals').select('*').eq('user_id', user.id).single()])
    setLogs(logsRes.data ?? [])
    setGoal(goalRes.data)
    setLoading(false)
  }

  async function deleteLog(id: string) {
    if (!confirm('Xóa bản ghi này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('weight_logs').delete().eq('id', id)
    if (error) { toast.error('Lỗi khi xóa'); return }
    toast.success('Đã xóa')
    loadData()
  }

  function exportCSV() {
    const header = 'Ngày,Cân nặng (kg),Vòng eo (cm),Vòng hông (cm),Ghi chú'
    const rows = logs.map(l =>
      `${formatDate(l.log_date)},${l.weight},${l.waist_cm ?? ''},${l.hip_cm ?? ''},"${l.note ?? ''}"` 
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'can-nang.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất CSV!')
  }

  const chartData = logs.map(w => ({ date: format(parseISO(w.log_date), 'd/M', { locale: vi }), weight: w.weight, target: goal?.target_weight }))
  const latest = logs[logs.length - 1]
  const prev = logs[logs.length - 2]
  const change = latest && prev ? latest.weight - prev.weight : null
  const minW = logs.length ? Math.min(...logs.map(l => l.weight)) : null
  const maxW = logs.length ? Math.max(...logs.map(l => l.weight)) : null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚖️ Nhật ký cân nặng</h1>
          <p className="page-subtitle">{logs.length} bản ghi</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="mochi-btn mochi-btn-secondary mochi-btn-sm">📥 Xuất CSV</button>
          <button onClick={() => { setEditingLog(undefined); setShowForm(true) }} className="mochi-btn mochi-btn-primary mochi-btn-sm">+ Ghi cân</button>
        </div>
      </div>

      <div className="period-filter">
        {(['7d','30d','3m','6m','1y','all'] as const).map(p => (
          <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === '7d' ? '7N' : p === '30d' ? '30N' : p === '3m' ? '3T' : p === '6m' ? '6T' : p === '1y' ? '1N' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Summary row */}
      {logs.length > 0 && (
        <div className="summary-row">
          <div className="summary-item">
            <div className="summary-label">Hiện tại</div>
            <div className="summary-value">{latest?.weight} kg</div>
            {change !== null && <div className={`summary-change ${change <= 0 ? 'good' : 'warn'}`}>{change > 0 ? '+' : ''}{change?.toFixed(1)} kg</div>}
          </div>
          <div className="summary-item">
            <div className="summary-label">Thấp nhất</div>
            <div className="summary-value">{minW} kg</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Cao nhất</div>
            <div className="summary-value">{maxW} kg</div>
          </div>
          {goal && (
            <div className="summary-item">
              <div className="summary-label">Mục tiêu</div>
              <div className="summary-value">{goal.target_weight} kg</div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="mochi-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 className="card-title">Biểu đồ cân nặng</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B8997A' }} />
              <YAxis tick={{ fontSize: 11, fill: '#B8997A' }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ background: 'white', border: '1.5px solid #F0E6D8', borderRadius: 12, fontFamily: 'Nunito' }} formatter={(v: number) => [`${v} kg`]} />
              <Line type="monotone" dataKey="weight" stroke="#FF7A5C" strokeWidth={2.5} dot={{ fill: '#FF7A5C', r: 4 }} />
              <Line type="monotone" dataKey="target" stroke="#3BB88E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Logs table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="mochi-skeleton" style={{ height: 56, borderRadius: 16 }} />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="mochi-empty-state">
          <div className="mascot">😿</div>
          <h3>Chưa có dữ liệu cân nặng</h3>
          <p>Hãy ghi lại cân nặng đầu tiên nhé!</p>
          <button className="mochi-btn mochi-btn-primary" onClick={() => setShowForm(true)}>⚖️ Ghi ngay</button>
        </div>
      ) : (
        <div className="logs-list">
          {[...logs].reverse().map(log => (
            <div key={log.id} className="log-item">
              <div className="log-date">{formatDate(log.log_date)}</div>
              <div className="log-weight">{log.weight} kg</div>
              {log.waist_cm && <div className="log-extra">Eo: {log.waist_cm} cm</div>}
              {log.note && <div className="log-note">📝 {log.note}</div>}
              <div className="log-actions">
                <button className="mochi-btn mochi-btn-ghost mochi-btn-sm" onClick={() => { setEditingLog(log); setShowForm(true) }}>✏️</button>
                <button className="mochi-btn mochi-btn-ghost mochi-btn-sm" onClick={() => deleteLog(log.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <WeightForm
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
        .period-filter { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .period-btn { padding: 5px 12px; border-radius: 999px; border: 1.5px solid var(--chocolate-200); background: white; color: var(--chocolate-500); font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .period-btn.active { background: var(--peach-300); border-color: var(--peach-300); color: white; }
        .summary-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .summary-item { flex: 1; min-width: 100px; background: white; border-radius: 16px; padding: 14px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); text-align: center; }
        .summary-label { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); margin-bottom: 4px; }
        .summary-value { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); }
        .summary-change { font-size: 0.75rem; font-weight: 700; margin-top: 2px; }
        .summary-change.good { color: var(--mint-400); }
        .summary-change.warn { color: var(--peach-400); }
        .card-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .logs-list { display: flex; flex-direction: column; gap: 8px; }
        .log-item { background: white; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-xs); border: 1.5px solid var(--chocolate-100); flex-wrap: wrap; }
        .log-date { font-size: 0.85rem; font-weight: 700; color: var(--chocolate-400); min-width: 80px; }
        .log-weight { font-size: 1rem; font-weight: 800; color: var(--chocolate-600); min-width: 70px; }
        .log-extra { font-size: 0.78rem; font-weight: 600; color: var(--chocolate-400); flex: 1; }
        .log-note { font-size: 0.78rem; color: var(--chocolate-400); font-weight: 600; flex: 1; }
        .log-actions { display: flex; gap: 4px; margin-left: auto; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(61,43,31,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 480px; box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .modal-header h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .modal-close { background: var(--cream); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; color: var(--chocolate-500); }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
      `}</style>
    </div>
  )
}

export default function WeightPage() {
  return <Suspense><WeightPageContent /></Suspense>
}
