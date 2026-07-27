'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { UserProfile, WeightGoal, StudyGoal } from '@/lib/types'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile } = useUser()
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [height, setHeight] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setHeight(profile.height_cm?.toString() ?? '')
    }
  }, [profile])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('user_profiles').update({
      display_name: displayName,
      height_cm: height ? Number(height) : null,
    }).eq('user_id', user.id)
    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success('Đã lưu hồ sơ!')
    setLoading(false)
  }

  async function exportData() {
    if (!user) return
    setExportLoading(true)
    const supabase = createClient()
    try {
      const [profiles, wGoals, wLogs, exLogs, vocab, grammar, sessions, txs, budgets, cats, wallets] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id),
        supabase.from('weight_goals').select('*').eq('user_id', user.id),
        supabase.from('weight_logs').select('*').eq('user_id', user.id),
        supabase.from('exercise_logs').select('*').eq('user_id', user.id),
        supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id),
        supabase.from('hsk_grammar').select('*').eq('user_id', user.id),
        supabase.from('study_sessions').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('expense_categories').select('*').eq('user_id', user.id),
        supabase.from('wallets').select('*').eq('user_id', user.id),
      ])
      const backup = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        user_id: user.id,
        data: {
          profile: profiles.data?.[0],
          weight_goals: wGoals.data,
          weight_logs: wLogs.data,
          exercise_logs: exLogs.data,
          hsk_vocabulary: vocab.data,
          hsk_grammar: grammar.data,
          study_sessions: sessions.data,
          transactions: txs.data,
          budgets: budgets.data,
          expense_categories: cats.data,
          wallets: wallets.data,
        }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mochi-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã sao lưu dữ liệu thành công!')
    } catch (e) {
      toast.error('Có lỗi khi xuất dữ liệu')
    } finally {
      setExportLoading(false)
    }
  }

  async function handleDeleteSampleData() {
    if (!user) return
    if (deleteConfirm !== 'XOA') { toast.error('Vui lòng nhập XOA để xác nhận'); return }
    const supabase = createClient()
    setLoading(true)
    try {
      await Promise.all([
        supabase.from('weight_logs').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('exercise_logs').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('hsk_vocabulary').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('hsk_grammar').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('study_sessions').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('transactions').delete().eq('user_id', user.id).eq('is_sample_data', true),
      ])
      toast.success('Đã xóa dữ liệu mẫu!')
      setDeleteConfirm('')
    } catch (e) {
      toast.error('Có lỗi khi xóa')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Đã đăng xuất. Hẹn gặp lại! 🐱')
    router.push('/login')
  }

  const tabs = [
    { id: 'profile', label: '👤 Hồ sơ' },
    { id: 'data', label: '💾 Dữ liệu' },
    { id: 'about', label: 'ℹ️ Về ứng dụng' },
  ]

  return (
    <div className="page">
      <h1 className="page-title">⚙️ Cài đặt</h1>

      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="settings-section">
          <div className="mochi-card" style={{ padding: 24 }}>
            <h2 className="section-title">Thông tin cá nhân</h2>
            <form onSubmit={handleSaveProfile} className="settings-form">
              <div className="form-group">
                <label className="mochi-label">Tên hiển thị</label>
                <input type="text" className="mochi-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="mochi-label">Chiều cao (cm)</label>
                <input type="number" className="mochi-input" placeholder="160" value={height} onChange={e => setHeight(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="mochi-label">Email</label>
                <input type="email" className="mochi-input" value={user?.email ?? ''} disabled />
                <span className="field-hint">Email không thể thay đổi</span>
              </div>
              <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : '💾 Lưu hồ sơ'}
              </button>
            </form>
          </div>

          <div className="danger-zone">
            <h3 className="danger-title">🚪 Đăng xuất</h3>
            <p>Đăng xuất khỏi tài khoản hiện tại</p>
            <button className="mochi-btn mochi-btn-secondary" onClick={handleLogout}>🐱 Đăng xuất</button>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="settings-section">
          <div className="mochi-card" style={{ padding: 24 }}>
            <h2 className="section-title">💾 Sao lưu & Khôi phục</h2>
            <div className="data-actions">
              <div className="data-action-item">
                <div className="da-info">
                  <div className="da-title">📥 Sao lưu dữ liệu</div>
                  <div className="da-desc">Tải về file JSON chứa toàn bộ dữ liệu của bạn</div>
                </div>
                <button className="mochi-btn mochi-btn-primary mochi-btn-sm" onClick={exportData} disabled={exportLoading}>
                  {exportLoading ? 'Đang xuất...' : '📥 Tải về'}
                </button>
              </div>
            </div>
          </div>

          <div className="danger-section mochi-card" style={{ padding: 24 }}>
            <h2 className="section-title danger-title">⚠️ Xóa dữ liệu mẫu</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--chocolate-400)', fontWeight: 600 }}>
              Xóa toàn bộ dữ liệu mẫu được tạo khi cài đặt ứng dụng.
            </p>
            <div className="confirm-input-group">
              <input
                type="text"
                className="mochi-input"
                placeholder='Nhập "XOA" để xác nhận'
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
              <button
                className="mochi-btn mochi-btn-danger mochi-btn-sm"
                onClick={handleDeleteSampleData}
                disabled={deleteConfirm !== 'XOA' || loading}
              >
                Xóa dữ liệu mẫu
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="settings-section">
          <div className="mochi-card about-card" style={{ padding: 32 }}>
            <span style={{ fontSize: '4rem' }}>🐱</span>
            <h2 className="about-title">Mochi Life</h2>
            <p className="about-version">Phiên bản 1.0.0</p>
            <p className="about-desc">Ứng dụng quản lý mục tiêu cá nhân theo phong cách kawaii. Giúp bạn theo dõi giảm cân, học tiếng Trung HSK 3 và kiểm soát chi tiêu.</p>
            <div className="about-features">
              <div className="feature-item">💪 Giảm cân & Luyện tập</div>
              <div className="feature-item">🈶 Học tiếng Trung HSK 3</div>
              <div className="feature-item">💰 Kiểm soát Chi tiêu</div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--chocolate-300)', fontWeight: 600, marginTop: 8 }}>Made with 🐱 and love</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .page { max-width: 700px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .settings-tabs { display: flex; background: white; border-radius: 20px; padding: 4px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); gap: 4px; }
        .tab-btn { flex: 1; padding: 10px 16px; border-radius: 16px; border: none; background: transparent; color: var(--chocolate-400); font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; }
        .tab-btn.active { background: var(--cream); color: var(--chocolate-600); box-shadow: var(--shadow-xs); }
        .settings-section { display: flex; flex-direction: column; gap: 16px; }
        .section-title { font-size: 1rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 20px; }
        .settings-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .field-hint { font-size: 0.75rem; color: var(--chocolate-300); font-weight: 600; }
        .danger-zone { background: white; border-radius: 20px; padding: 24px; border: 1.5px solid var(--peach-200); }
        .danger-section { border: 1.5px solid var(--peach-200) !important; }
        .danger-title { color: var(--peach-500) !important; }
        .danger-zone p { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 8px 0 16px; }
        .data-actions { display: flex; flex-direction: column; gap: 12px; }
        .data-action-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px; background: var(--cream); border-radius: 14px; flex-wrap: wrap; }
        .da-title { font-size: 0.9rem; font-weight: 700; color: var(--chocolate-600); margin-bottom: 3px; }
        .da-desc { font-size: 0.78rem; color: var(--chocolate-400); font-weight: 600; }
        .confirm-input-group { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .confirm-input-group .mochi-input { flex: 1; min-width: 180px; }
        .about-card { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
        .about-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .about-version { font-size: 0.82rem; color: var(--chocolate-300); font-weight: 700; margin: 0; background: var(--cream); padding: 3px 12px; border-radius: 999px; }
        .about-desc { font-size: 0.9rem; color: var(--chocolate-500); font-weight: 600; line-height: 1.6; max-width: 400px; margin: 0; }
        .about-features { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 300px; }
        .feature-item { background: var(--cream); padding: 10px 16px; border-radius: 12px; font-weight: 700; font-size: 0.875rem; color: var(--chocolate-600); text-align: left; }
        @media (max-width: 480px) {
          .settings-tabs { flex-direction: column; }
          .tab-btn { text-align: left; }
        }
      `}</style>
    </div>
  )
}
