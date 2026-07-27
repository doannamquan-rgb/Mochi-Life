'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/format'

const steps = [
  { id: 1, title: 'Giảm cân & Luyện tập', emoji: '💪' },
  { id: 2, title: 'Học tiếng Trung', emoji: '🈶' },
  { id: 3, title: 'Kiểm soát Chi tiêu', emoji: '💰' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useUser()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Fitness
  const [currentWeight, setCurrentWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [weeklyGoal, setWeeklyGoal] = useState('3')
  const [height, setHeight] = useState('')

  // Step 2: Chinese
  const [dailyWords, setDailyWords] = useState('10')
  const [dailyMinutes, setDailyMinutes] = useState('30')
  const [proficiency, setProficiency] = useState('beginner')

  // Step 3: Expense
  const [monthBudget, setMonthBudget] = useState('')
  const [cycleStart, setCycleStart] = useState('1')

  function validateStep(): string | null {
    if (step === 1) {
      if (!currentWeight || isNaN(Number(currentWeight))) return 'Vui lòng nhập cân nặng hiện tại'
      if (!targetWeight || isNaN(Number(targetWeight))) return 'Vui lòng nhập cân nặng mục tiêu'
      if (Number(currentWeight) < 20 || Number(currentWeight) > 300) return 'Cân nặng không hợp lệ'
    }
    if (step === 3) {
      if (monthBudget && isNaN(Number(monthBudget.replace(/[,\.]/g, '')))) return 'Ngân sách không hợp lệ'
    }
    return null
  }

  async function handleNext() {
    const err = validateStep()
    if (err) { toast.error(err); return }
    if (step < 3) {
      setStep(s => s + 1)
    } else {
      await handleFinish()
    }
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const now = new Date()

    try {
      // Create weight goal
      if (currentWeight && targetWeight) {
        await supabase.from('weight_goals').upsert({
          user_id: user.id,
          starting_weight: Number(currentWeight),
          current_weight: Number(currentWeight),
          target_weight: Number(targetWeight),
          start_date: now.toISOString().split('T')[0],
          daily_calorie_goal: 500,
        }, { onConflict: 'user_id' })

        // Log initial weight
        await supabase.from('weight_logs').upsert({
          user_id: user.id,
          log_date: now.toISOString().split('T')[0],
          weight: Number(currentWeight),
          note: 'Cân nặng ban đầu',
        }, { onConflict: 'user_id,log_date' })
      }

      // Update profile height
      if (height) {
        await supabase.from('user_profiles')
          .update({ height_cm: Number(height) })
          .eq('user_id', user.id)
      }

      // Create fitness goals
      await supabase.from('fitness_goals').upsert({
        user_id: user.id,
        weekly_sessions: Number(weeklyGoal),
        weekly_minutes: Number(weeklyGoal) * 45,
        weekly_calories: Number(weeklyGoal) * 400,
        daily_steps: 8000,
      }, { onConflict: 'user_id' })

      // Create study goals
      await supabase.from('study_goals').upsert({
        user_id: user.id,
        daily_new_words: Number(dailyWords),
        daily_review_words: Number(dailyWords) * 2,
        daily_minutes: Number(dailyMinutes),
        current_hsk_level: 'HSK3',
        current_proficiency: proficiency,
      }, { onConflict: 'user_id' })

      // Create default HSK course
      const { data: course } = await supabase.from('hsk_courses').insert({
        user_id: user.id,
        name: 'HSK 3 - Giáo trình chuẩn',
        level: 'HSK3',
        description: 'Chương trình học tiếng Trung HSK cấp 3',
      }).select().single()

      // Create default expense categories
      for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
        const cat = DEFAULT_EXPENSE_CATEGORIES[i]
        await supabase.from('expense_categories').insert({
          user_id: user.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          is_default: true,
          sort_order: i,
        })
      }

      // Create default wallet
      await supabase.from('wallets').insert({
        user_id: user.id,
        name: 'Ví tiền mặt',
        type: 'cash',
        icon: '💵',
        color: '#3BB88E',
        is_default: true,
      })

      // Create budget if set
      if (monthBudget) {
        const amount = Number(monthBudget.replace(/[,\.]/g, ''))
        if (amount > 0) {
          await supabase.from('budgets').insert({
            user_id: user.id,
            category_id: null,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            amount,
            is_total_budget: true,
            cycle_start_day: Number(cycleStart),
          })
        }
      }

      // Mark onboarding complete
      await supabase.from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)

      toast.success('Thiết lập xong rồi! Chào mừng đến Mochi Life 🐱✨')
      router.push('/dashboard')
    } catch (e) {
      console.error(e)
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-header">
          <span className="onboarding-mascot animate-float">🐱</span>
          <h1>Thiết lập Mochi Life</h1>
          <p>Chỉ mất 2 phút để bắt đầu nhé!</p>
        </div>

        {/* Step indicators */}
        <div className="step-indicators">
          {steps.map(s => (
            <div key={s.id} className={`step-indicator ${step >= s.id ? 'active' : ''} ${step === s.id ? 'current' : ''}`}>
              <div className="step-dot">
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="step-label">{s.title}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="step-content">
          {step === 1 && (
            <div className="step-form">
              <div className="step-title">
                <span>💪</span>
                <h2>Mục tiêu giảm cân</h2>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="mochi-label">Cân nặng hiện tại (kg) *</label>
                  <input
                    type="number"
                    className="mochi-input"
                    placeholder="60"
                    value={currentWeight}
                    onChange={e => setCurrentWeight(e.target.value)}
                    step="0.1"
                    min="20"
                    max="300"
                  />
                </div>
                <div className="form-group">
                  <label className="mochi-label">Cân nặng mục tiêu (kg) *</label>
                  <input
                    type="number"
                    className="mochi-input"
                    placeholder="55"
                    value={targetWeight}
                    onChange={e => setTargetWeight(e.target.value)}
                    step="0.1"
                    min="20"
                    max="300"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="mochi-label">Chiều cao (cm) - không bắt buộc</label>
                <input
                  type="number"
                  className="mochi-input"
                  placeholder="160"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  min="100"
                  max="250"
                />
              </div>

              <div className="form-group">
                <label className="mochi-label">Mục tiêu tập luyện mỗi tuần</label>
                <div className="radio-grid">
                  {['2', '3', '4', '5', '6'].map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`radio-option ${weeklyGoal === v ? 'selected' : ''}`}
                      onClick={() => setWeeklyGoal(v)}
                    >
                      {v} buổi
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-form">
              <div className="step-title">
                <span>🈶</span>
                <h2>Học tiếng Trung HSK 3</h2>
              </div>

              <div className="form-group">
                <label className="mochi-label">Trình độ hiện tại</label>
                <div className="radio-grid">
                  {[
                    { value: 'beginner', label: 'Mới bắt đầu' },
                    { value: 'elementary', label: 'Sơ cấp (HSK1-2)' },
                    { value: 'intermediate', label: 'Trung cấp (HSK3)' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`radio-option ${proficiency === opt.value ? 'selected' : ''}`}
                      onClick={() => setProficiency(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="mochi-label">Từ mới mỗi ngày</label>
                  <div className="radio-grid">
                    {['5', '10', '15', '20'].map(v => (
                      <button
                        key={v}
                        type="button"
                        className={`radio-option ${dailyWords === v ? 'selected' : ''}`}
                        onClick={() => setDailyWords(v)}
                      >
                        {v} từ
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="mochi-label">Thời gian học mỗi ngày</label>
                  <div className="radio-grid">
                    {['15', '30', '45', '60'].map(v => (
                      <button
                        key={v}
                        type="button"
                        className={`radio-option ${dailyMinutes === v ? 'selected' : ''}`}
                        onClick={() => setDailyMinutes(v)}
                      >
                        {v} phút
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="info-box">
                <span>ℹ️</span>
                <p>Giáo trình HSK 3 sẽ được cài đặt sẵn. Bạn có thể thêm từ vựng và ngữ pháp sau khi thiết lập xong.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-form">
              <div className="step-title">
                <span>💰</span>
                <h2>Kiểm soát chi tiêu</h2>
              </div>

              <div className="form-group">
                <label className="mochi-label">Ngân sách tháng (VND) - không bắt buộc</label>
                <input
                  type="text"
                  className="mochi-input"
                  placeholder="5,000,000"
                  value={monthBudget}
                  onChange={e => setMonthBudget(e.target.value)}
                />
                <span className="input-hint">Có thể cài đặt lại sau trong phần Cài đặt</span>
              </div>

              <div className="form-group">
                <label className="mochi-label">Ngày bắt đầu chu kỳ ngân sách</label>
                <div className="radio-grid">
                  {['1', '5', '10', '15', '25'].map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`radio-option ${cycleStart === v ? 'selected' : ''}`}
                      onClick={() => setCycleStart(v)}
                    >
                      Ngày {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="info-box">
                <span>🐱</span>
                <p>Mochi sẽ tạo sẵn các danh mục chi tiêu và ví tiền mặt mặc định cho bạn!</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="step-nav">
          {step > 1 && (
            <button
              type="button"
              className="mochi-btn mochi-btn-secondary"
              onClick={() => setStep(s => s - 1)}
              disabled={loading}
            >
              ← Quay lại
            </button>
          )}
          <button
            type="button"
            className="mochi-btn mochi-btn-primary mochi-btn-lg"
            onClick={handleNext}
            disabled={loading}
            style={{ marginLeft: step > 1 ? undefined : 'auto' }}
          >
            {loading
              ? 'Đang lưu...'
              : step === 3
                ? '🐱 Bắt đầu thôi!'
                : 'Tiếp theo →'
            }
          </button>
        </div>

        <button
          type="button"
          className="skip-btn"
          onClick={handleFinish}
          disabled={loading}
        >
          Bỏ qua thiết lập
        </button>
      </div>

      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-image: radial-gradient(circle at 20% 20%, #FFF5CC 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, #EDFAF5 0%, transparent 50%),
                            radial-gradient(circle at 60% 10%, #F5F2FF 0%, transparent 40%);
        }

        .onboarding-card {
          width: 100%;
          max-width: 560px;
          background: white;
          border-radius: 28px;
          padding: 40px;
          box-shadow: 0 8px 40px rgba(61, 43, 31, 0.12);
          border: 1.5px solid var(--chocolate-100);
        }

        .onboarding-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .onboarding-mascot {
          display: inline-block;
          font-size: 3rem;
          margin-bottom: 12px;
        }

        .onboarding-header h1 {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0 0 6px;
        }

        .onboarding-header p {
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 0;
          font-size: 0.9rem;
        }

        .step-indicators {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 32px;
          padding: 16px;
          background: var(--cream);
          border-radius: 20px;
        }

        .step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
        }

        .step-indicator:not(:last-child)::after {
          display: none;
        }

        .step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--chocolate-100);
          color: var(--chocolate-300);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          transition: all 0.3s;
        }

        .step-indicator.active .step-dot {
          background: var(--cheese-200);
          color: var(--chocolate-600);
        }

        .step-indicator.current .step-dot {
          background: var(--cheese-400);
          box-shadow: 0 0 0 4px rgba(255, 202, 26, 0.25);
        }

        .step-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--chocolate-300);
          text-align: center;
          transition: color 0.3s;
        }

        .step-indicator.active .step-label { color: var(--chocolate-500); }
        .step-indicator.current .step-label { color: var(--chocolate-600); }

        .step-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .step-title span { font-size: 1.5rem; }
        .step-title h2 { font-size: 1.2rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }

        .step-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-hint {
          font-size: 0.78rem;
          color: var(--chocolate-300);
          font-weight: 600;
        }

        .radio-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .radio-option {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1.5px solid var(--chocolate-200);
          background: white;
          color: var(--chocolate-500);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Nunito', sans-serif;
        }

        .radio-option:hover {
          border-color: var(--cheese-400);
          background: var(--cheese-50);
        }

        .radio-option.selected {
          background: var(--cheese-400);
          border-color: var(--cheese-400);
          color: var(--chocolate-700);
        }

        .info-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 16px;
          background: var(--lavender-50);
          border-radius: 16px;
          border: 1.5px solid var(--lavender-100);
        }

        .info-box span { font-size: 1.2rem; flex-shrink: 0; }
        .info-box p { font-size: 0.85rem; font-weight: 600; color: var(--lavender-500); margin: 0; line-height: 1.5; }

        .step-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .step-nav .mochi-btn-primary {
          flex: 1;
        }

        .skip-btn {
          display: block;
          width: 100%;
          text-align: center;
          background: none;
          border: none;
          color: var(--chocolate-300);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
          padding: 8px;
          transition: color 0.15s;
        }

        .skip-btn:hover { color: var(--chocolate-500); }

        @media (max-width: 480px) {
          .onboarding-card { padding: 24px 20px; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
