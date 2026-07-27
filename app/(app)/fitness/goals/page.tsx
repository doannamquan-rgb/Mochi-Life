'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { todayString } from '@/lib/date-utils'
import type { WeightGoal, FitnessGoal } from '@/lib/types'
import { formatWeight, calculateBMI, formatBMI, getBMICategory } from '@/lib/format'

export default function FitnessGoalsPage() {
  const { user, profile } = useUser()
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null)
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Weight goal form
  const [startWeight, setStartWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [startDate, setStartDate] = useState(todayString())
  const [targetDate, setTargetDate] = useState('')
  const [dailyCalorie, setDailyCalorie] = useState('')

  // Fitness goal form
  const [weeklySessions, setWeeklySessions] = useState('3')
  const [weeklyMinutes, setWeeklyMinutes] = useState('150')
  const [weeklyCalories, setWeeklyCalories] = useState('1000')
  const [dailySteps, setDailySteps] = useState('8000')

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const [wg, fg] = await Promise.all([
      supabase.from('weight_goals').select('*').eq('user_id', user.id).single(),
      supabase.from('fitness_goals').select('*').eq('user_id', user.id).single(),
    ])
    if (wg.data) {
      setWeightGoal(wg.data)
      setStartWeight(wg.data.starting_weight.toString())
      setTargetWeight(wg.data.target_weight.toString())
      setStartDate(wg.data.start_date)
      setTargetDate(wg.data.target_date ?? '')
      setDailyCalorie(wg.data.daily_calorie_goal?.toString() ?? '')
    }
    if (fg.data) {
      setFitnessGoal(fg.data)
      setWeeklySessions(fg.data.weekly_sessions.toString())
      setWeeklyMinutes(fg.data.weekly_minutes.toString())
      setWeeklyCalories(fg.data.weekly_calories.toString())
      setDailySteps(fg.data.daily_steps.toString())
    }
    setLoading(false)
  }

  async function saveWeightGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const sw = Number(startWeight), tw = Number(targetWeight)
    if (!sw || !tw) { toast.error('Vui lòng nhập cân nặng hợp lệ'); return }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      starting_weight: sw,
      current_weight: sw,
      target_weight: tw,
      start_date: startDate,
      target_date: targetDate || null,
      daily_calorie_goal: dailyCalorie ? Number(dailyCalorie) : 1800,
    }
    const { error } = weightGoal
      ? await supabase.from('weight_goals').update(payload).eq('id', weightGoal.id)
      : await supabase.from('weight_goals').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setSaving(false); return }
    toast.success('Đã lưu mục tiêu cân nặng! 🎯')
    loadData()
    setSaving(false)
  }

  async function saveFitnessGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      weekly_sessions: Number(weeklySessions),
      weekly_minutes: Number(weeklyMinutes),
      weekly_calories: Number(weeklyCalories),
      daily_steps: Number(dailySteps),
    }
    const { error } = fitnessGoal
      ? await supabase.from('fitness_goals').update(payload).eq('id', fitnessGoal.id)
      : await supabase.from('fitness_goals').insert(payload)
    if (error) { toast.error('Lỗi: ' + error.message); setSaving(false); return }
    toast.success('Đã lưu mục tiêu tập luyện! 💪')
    loadData()
    setSaving(false)
  }

  // BMI preview
  const currentWeight = Number(startWeight)
  const height = profile?.height_cm
  const bmi = currentWeight && height ? calculateBMI(currentWeight, height) : null
  const bmiInfo = bmi ? getBMICategory(bmi) : null

  const targetWeight_n = Number(targetWeight)
  const tolose = currentWeight && targetWeight_n ? currentWeight - targetWeight_n : 0
  const weeksEstimate = tolose > 0 && targetDate
    ? Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (7 * 24 * 3600 * 1000))
    : null

  return (
    <div className="page">
      <h1 className="page-title">🎯 Mục tiêu sức khoẻ</h1>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => <div key={i} className="mochi-skeleton" style={{ height: 300, borderRadius: 24 }} />)}
        </div>
      ) : (
        <>
          {/* Weight Goal */}
          <div className="mochi-card goal-section">
            <div className="section-header">
              <div className="section-icon">⚖️</div>
              <div>
                <h2 className="section-title">Mục tiêu cân nặng</h2>
                <p className="section-sub">Đặt cân nặng mục tiêu và theo dõi tiến độ</p>
              </div>
            </div>

            {bmi && bmiInfo && (
              <div className="bmi-display" style={{ borderColor: bmiInfo.color }}>
                <div className="bmi-val" style={{ color: bmiInfo.color }}>{formatBMI(bmi)}</div>
                <div className="bmi-label">BMI hiện tại</div>
                <div className="bmi-cat" style={{ background: `${bmiInfo.color}20`, color: bmiInfo.color }}>{bmiInfo.label}</div>
              </div>
            )}

            <form onSubmit={saveWeightGoal} className="goal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="mochi-label">Cân nặng hiện tại (kg) *</label>
                  <input type="number" className="mochi-input" placeholder="70" value={startWeight} onChange={e => setStartWeight(e.target.value)} step="0.1" min="30" max="300" required />
                </div>
                <div className="form-group">
                  <label className="mochi-label">Cân nặng mục tiêu (kg) *</label>
                  <input type="number" className="mochi-input" placeholder="60" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} step="0.1" min="30" max="300" required />
                </div>
              </div>

              {tolose !== 0 && (
                <div className={`goal-hint ${tolose > 0 ? 'lose' : 'gain'}`}>
                  {tolose > 0 ? `📉 Cần giảm ${tolose.toFixed(1)} kg` : `📈 Cần tăng ${Math.abs(tolose).toFixed(1)} kg`}
                  {weeksEstimate && weeksEstimate > 0 && ` trong ${weeksEstimate} tuần`}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="mochi-label">Ngày bắt đầu</label>
                  <input type="date" className="mochi-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="mochi-label">Ngày mục tiêu</label>
                  <input type="date" className="mochi-input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="mochi-label">Mục tiêu calo hàng ngày (kcal)</label>
                <input type="number" className="mochi-input" placeholder="1800" value={dailyCalorie} onChange={e => setDailyCalorie(e.target.value)} min="800" max="5000" />
                <span style={{ fontSize: '0.75rem', color: 'var(--chocolate-300)', fontWeight: 600, marginTop: 3 }}>
                  Khuyến nghị: {tolose > 0 ? '1500–1800' : '2000–2500'} kcal/ngày
                </span>
              </div>

              <button type="submit" className="mochi-btn mochi-btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu mục tiêu cân nặng'}</button>
            </form>
          </div>

          {/* Fitness Goal */}
          <div className="mochi-card goal-section">
            <div className="section-header">
              <div className="section-icon">💪</div>
              <div>
                <h2 className="section-title">Mục tiêu tập luyện</h2>
                <p className="section-sub">Đặt mục tiêu tập luyện hàng tuần</p>
              </div>
            </div>

            <form onSubmit={saveFitnessGoal} className="goal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="mochi-label">Số buổi tập/tuần</label>
                  <input type="number" className="mochi-input" value={weeklySessions} onChange={e => setWeeklySessions(e.target.value)} min="1" max="7" />
                </div>
                <div className="form-group">
                  <label className="mochi-label">Số phút tập/tuần</label>
                  <input type="number" className="mochi-input" value={weeklyMinutes} onChange={e => setWeeklyMinutes(e.target.value)} min="30" max="2000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="mochi-label">Calo tiêu hao/tuần (kcal)</label>
                  <input type="number" className="mochi-input" value={weeklyCalories} onChange={e => setWeeklyCalories(e.target.value)} min="100" />
                </div>
                <div className="form-group">
                  <label className="mochi-label">Bước chân mục tiêu/ngày</label>
                  <input type="number" className="mochi-input" value={dailySteps} onChange={e => setDailySteps(e.target.value)} min="1000" step="500" />
                </div>
              </div>

              <div className="fitness-tips">
                <div className="tip">WHO khuyến nghị: ≥150 phút/tuần cường độ vừa</div>
                <div className="tip">Mục tiêu bước chân phổ biến: 8,000–10,000 bước/ngày</div>
              </div>

              <button type="submit" className="mochi-btn mochi-btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu mục tiêu tập luyện'}</button>
            </form>
          </div>
        </>
      )}

      <style jsx>{`
        .page { max-width: 700px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .goal-section { padding: 24px; }
        .section-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
        .section-icon { width: 48px; height: 48px; border-radius: 16px; background: var(--peach-50); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
        .section-title { font-size: 1rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .section-sub { font-size: 0.82rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .bmi-display { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--cream); border-radius: 16px; border: 2px solid; margin-bottom: 20px; }
        .bmi-val { font-size: 1.8rem; font-weight: 800; }
        .bmi-label { font-size: 0.78rem; font-weight: 700; color: var(--chocolate-400); flex: 1; }
        .bmi-cat { font-size: 0.78rem; font-weight: 800; padding: 4px 12px; border-radius: 999px; }
        .goal-form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .goal-hint { font-size: 0.875rem; font-weight: 700; padding: 10px 14px; border-radius: 14px; }
        .goal-hint.lose { background: var(--mint-50); color: var(--mint-500); border: 1.5px solid var(--mint-200); }
        .goal-hint.gain { background: var(--peach-50); color: var(--peach-500); border: 1.5px solid var(--peach-200); }
        .fitness-tips { background: var(--cheese-50); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; border: 1.5px solid var(--cheese-200); }
        .tip { font-size: 0.8rem; font-weight: 600; color: var(--chocolate-500); display: flex; align-items: flex-start; gap: 6px; }
        .tip::before { content: '💡'; flex-shrink: 0; }
        @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
