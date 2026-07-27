'use client'

import Link from 'next/link'

const ACHIEVEMENTS = [
  { emoji: '⚖️', name: 'Cân lần đầu', desc: 'Ghi cân nặng lần đầu tiên', cat: 'fitness', locked: false },
  { emoji: '🏃', name: 'Buổi tập đầu', desc: 'Hoàn thành buổi tập đầu tiên', cat: 'fitness', locked: false },
  { emoji: '🔥', name: 'Tuần lửa', desc: 'Tập luyện 5 ngày trong 1 tuần', cat: 'fitness', locked: true },
  { emoji: '💪', name: 'Chiến binh', desc: 'Tập luyện 30 buổi', cat: 'fitness', locked: true },
  { emoji: '📖', name: 'Người học', desc: 'Học từ vựng đầu tiên', cat: 'study', locked: false },
  { emoji: '🈶', name: 'HSK Starter', desc: 'Học 50 từ vựng', cat: 'study', locked: true },
  { emoji: '🧠', name: 'Trí tuệ', desc: 'Ôn tập 100 từ', cat: 'study', locked: true },
  { emoji: '🏆', name: 'Bậc thầy', desc: 'Thành thạo 200 từ', cat: 'study', locked: true },
  { emoji: '💰', name: 'Quản lý chi tiêu', desc: 'Ghi giao dịch đầu tiên', cat: 'expense', locked: false },
  { emoji: '🎯', name: 'Trong ngân sách', desc: 'Duy trì ngân sách 1 tháng', cat: 'expense', locked: true },
  { emoji: '💸', name: 'Tiết kiệm giỏi', desc: 'Tiết kiệm 1 triệu trong tháng', cat: 'expense', locked: true },
  { emoji: '🌟', name: 'Toàn diện', desc: 'Hoàn thành 3 module trong 1 ngày', cat: 'general', locked: true },
]

const CAT_LABELS: Record<string, { label: string; color: string }> = {
  fitness: { label: '💪 Sức khoẻ', color: '#FF7A5C' },
  study: { label: '📚 Học tập', color: '#8F71F5' },
  expense: { label: '💰 Chi tiêu', color: '#3BB88E' },
  general: { label: '🌟 Tổng hợp', color: '#FFCA1A' },
}

export default function AchievementsPage() {
  const unlocked = ACHIEVEMENTS.filter(a => !a.locked)
  const locked = ACHIEVEMENTS.filter(a => a.locked)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Thành tích</h1>
          <p className="page-subtitle">{unlocked.length}/{ACHIEVEMENTS.length} thành tích đã mở khoá</p>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-banner">
        <div className="pb-left">
          <span className="pb-emoji">🏅</span>
          <div>
            <div className="pb-title">Tiến độ thành tích</div>
            <div className="pb-sub">{unlocked.length} đã đạt · {locked.length} còn lại</div>
          </div>
        </div>
        <div className="pb-pct">{Math.round(unlocked.length / ACHIEVEMENTS.length * 100)}%</div>
      </div>
      <div className="mochi-progress" style={{ marginBottom: 24 }}>
        <div className="mochi-progress-bar" style={{ width: `${unlocked.length / ACHIEVEMENTS.length * 100}%`, background: 'linear-gradient(90deg, #FFCA1A, #FF9A80)' }} />
      </div>

      {/* Unlocked */}
      <h2 className="section-title">✅ Đã đạt được ({unlocked.length})</h2>
      <div className="achievements-grid">
        {unlocked.map((a, i) => (
          <div key={i} className="achievement-card unlocked">
            <div className="achievement-emoji">{a.emoji}</div>
            <div className="achievement-name">{a.name}</div>
            <div className="achievement-desc">{a.desc}</div>
            <span className="achievement-cat" style={{ background: `${CAT_LABELS[a.cat].color}20`, color: CAT_LABELS[a.cat].color }}>
              {CAT_LABELS[a.cat].label}
            </span>
          </div>
        ))}
      </div>

      {/* Locked */}
      <h2 className="section-title" style={{ marginTop: 8 }}>🔒 Chưa mở khoá ({locked.length})</h2>
      <div className="achievements-grid">
        {locked.map((a, i) => (
          <div key={i} className="achievement-card locked">
            <div className="achievement-emoji locked-emoji">?</div>
            <div className="achievement-name locked-name">{a.name}</div>
            <div className="achievement-desc">{a.desc}</div>
            <span className="achievement-cat" style={{ background: '#F0E6D8', color: '#B8997A' }}>
              {CAT_LABELS[a.cat].label}
            </span>
          </div>
        ))}
      </div>

      <div className="coming-soon-note">
        <span>🐱</span>
        <p>Mochi đang cập nhật thêm nhiều thành tích mới. Hãy tiếp tục cố gắng nhé!</p>
      </div>

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 4px; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 0; }
        .progress-banner { background: white; border-radius: 20px; padding: 16px 20px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); display: flex; align-items: center; justify-content: space-between; }
        .pb-left { display: flex; align-items: center; gap: 14px; }
        .pb-emoji { font-size: 2rem; }
        .pb-title { font-weight: 800; font-size: 0.95rem; color: var(--chocolate-600); }
        .pb-sub { font-size: 0.8rem; font-weight: 600; color: var(--chocolate-400); margin-top: 2px; }
        .pb-pct { font-size: 1.5rem; font-weight: 800; color: var(--cheese-500); }
        .section-title { font-size: 0.95rem; font-weight: 800; color: var(--chocolate-600); margin: 8px 0 0; }
        .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .achievement-card { background: white; border-radius: 20px; padding: 18px 14px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; transition: all 0.2s; }
        .achievement-card.unlocked { border-color: var(--cheese-200); background: linear-gradient(135deg, #FFFDF0, #FFF8F0); }
        .achievement-card.unlocked:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        .achievement-card.locked { opacity: 0.6; background: var(--cream); }
        .achievement-emoji { font-size: 2.5rem; }
        .locked-emoji { font-size: 2rem; color: var(--chocolate-300); background: var(--chocolate-100); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .achievement-name { font-weight: 800; font-size: 0.875rem; color: var(--chocolate-600); }
        .locked-name { color: var(--chocolate-400); }
        .achievement-desc { font-size: 0.75rem; font-weight: 600; color: var(--chocolate-400); line-height: 1.4; }
        .achievement-cat { font-size: 0.65rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
        .coming-soon-note { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--lavender-50); border-radius: 16px; border: 1.5px solid var(--lavender-200); margin-top: 8px; font-size: 1.3rem; }
        .coming-soon-note p { font-size: 0.875rem; font-weight: 600; color: var(--lavender-500); margin: 0; }
        @media (max-width: 480px) { .achievements-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  )
}
