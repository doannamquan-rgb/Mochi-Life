'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { calculateLevelFromXP } from '@/lib/gamification'
import type { Achievement, UserAchievement } from '@/lib/types'

const CAT_LABELS: Record<string, { label: string; color: string }> = {
  fitness: { label: '💪 Sức khỏe', color: '#FF7A5C' },
  study: { label: '📚 Học tập', color: '#8F71F5' },
  expense: { label: '💰 Tài chính', color: '#3BB88E' },
  general: { label: '🌟 Tổng hợp', color: '#FFCA1A' },
}

export default function AchievementsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [unlockedMap, setUnlockedMap] = useState<Map<string, string>>(new Map())
  const [totalXP, setTotalXP] = useState(0)
  const [selectedCat, setSelectedCat] = useState<string>('all')

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    const [achRes, userAchRes, xpRes] = await Promise.all([
      supabase.from('achievements').select('*').order('created_at'),
      supabase.from('user_achievements').select('*').eq('user_id', user.id),
      supabase.from('user_xp_logs').select('amount').eq('user_id', user.id),
    ])

    const allAchievements = achRes.data ?? []
    const userUnlocked = userAchRes.data ?? []
    const uMap = new Map<string, string>()
    userUnlocked.forEach((u: UserAchievement) => {
      uMap.set(u.achievement_id, u.unlocked_at)
    })

    const sumXP = (xpRes.data ?? []).reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)

    setAchievements(allAchievements)
    setUnlockedMap(uMap)
    setTotalXP(sumXP)
    setLoading(false)
  }

  const levelInfo = calculateLevelFromXP(totalXP)

  const filteredAchievements = achievements.filter(a => {
    if (selectedCat === 'all') return true
    return a.category === selectedCat
  })

  const unlockedCount = achievements.filter(a => unlockedMap.has(a.id)).length
  const totalCount = achievements.length
  const unlockedPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="page">
        <div className="mochi-skeleton" style={{ height: 160, borderRadius: 24 }} />
        <div className="achievements-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="mochi-skeleton" style={{ height: 140, borderRadius: 20 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Thành tích & Cấp độ</h1>
          <p className="page-subtitle">{unlockedCount}/{totalCount} thành tích đã mở khóa · Cấp độ {levelInfo.level}</p>
        </div>
      </div>

      {/* Level & XP Banner */}
      <div className="hero-banner">
        <div className="level-badge-large">
          <span className="level-num">Cấp {levelInfo.level}</span>
          <span className="xp-total">{totalXP} XP</span>
        </div>
        <div className="level-details">
          <div className="level-title-row">
            <span>Tiến độ cấp độ tiếp theo</span>
            <span>{levelInfo.currentProgressXP} / {levelInfo.neededXPForNextLevel} XP ({levelInfo.progressPct}%)</span>
          </div>
          <div className="mochi-progress" style={{ marginTop: 8 }}>
            <div className="mochi-progress-bar" style={{ width: `${levelInfo.progressPct}%`, background: 'linear-gradient(90deg, #FFCA1A, #FF7A5C)' }} />
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="category-filters">
        <button
          className={`filter-btn ${selectedCat === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCat('all')}
        >
          Tất cả ({achievements.length})
        </button>
        {Object.entries(CAT_LABELS).map(([key, info]) => {
          const count = achievements.filter(a => a.category === key).length
          return (
            <button
              key={key}
              className={`filter-btn ${selectedCat === key ? 'active' : ''}`}
              onClick={() => setSelectedCat(key)}
            >
              {info.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Achievements grid */}
      <div className="achievements-grid">
        {filteredAchievements.map(a => {
          const isUnlocked = unlockedMap.has(a.id)
          const unlockedTime = unlockedMap.get(a.id)
          const catInfo = CAT_LABELS[a.category] || { label: 'Tổng hợp', color: '#FFCA1A' }

          return (
            <div key={a.id} className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
              <div className="achievement-emoji">{isUnlocked ? a.icon : '🔒'}</div>
              <div className="achievement-name">{a.name}</div>
              <div className="achievement-desc">{a.description}</div>
              <span className="achievement-cat" style={{ background: `${catInfo.color}20`, color: catInfo.color }}>
                {catInfo.label}
              </span>
              {isUnlocked && unlockedTime && (
                <span className="unlocked-time">
                  Đạt được: {new Date(unlockedTime).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="coming-soon-note">
        <span>🐱</span>
        <p>Tiếp tục hoàn thành mục tiêu tập luyện, học tập và tài chính để nhận thêm XP và mở khóa nhiều thành tích mới!</p>
      </div>

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .hero-banner { background: white; border-radius: 24px; padding: 20px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .level-badge-large { background: linear-gradient(135deg, #FFCA1A, #FF9A80); padding: 16px 24px; border-radius: 20px; color: var(--chocolate-700); display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .level-num { font-size: 1.3rem; font-weight: 800; }
        .xp-total { font-size: 0.8rem; font-weight: 700; opacity: 0.9; }
        .level-details { flex: 1; min-width: 240px; }
        .level-title-row { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: var(--chocolate-600); }
        .category-filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .filter-btn { padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--chocolate-100); background: white; font-weight: 700; font-size: 0.8rem; color: var(--chocolate-500); cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .filter-btn.active { background: var(--cheese-100); border-color: var(--cheese-300); color: var(--chocolate-700); }
        .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
        .achievement-card { background: white; border-radius: 20px; padding: 18px 14px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; transition: all 0.2s; }
        .achievement-card.unlocked { border-color: var(--cheese-200); background: linear-gradient(135deg, #FFFDF0, #FFF8F0); }
        .achievement-card.unlocked:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        .achievement-card.locked { opacity: 0.6; background: var(--cream); }
        .achievement-emoji { font-size: 2.5rem; }
        .achievement-name { font-weight: 800; font-size: 0.875rem; color: var(--chocolate-600); }
        .achievement-desc { font-size: 0.75rem; font-weight: 600; color: var(--chocolate-400); line-height: 1.4; }
        .achievement-cat { font-size: 0.65rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
        .unlocked-time { font-size: 0.65rem; font-weight: 600; color: var(--chocolate-300); margin-top: 2px; }
        .coming-soon-note { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--lavender-50); border-radius: 16px; border: 1.5px solid var(--lavender-200); margin-top: 8px; font-size: 1.3rem; }
        .coming-soon-note p { font-size: 0.875rem; font-weight: 600; color: var(--lavender-500); margin: 0; }
        @media (max-width: 480px) { .achievements-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  )
}
