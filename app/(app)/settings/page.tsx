'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { HskCourse } from '@/lib/types'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, updateLocalProfile } = useUser()
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [height, setHeight] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [initUserId, setInitUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('profile')

  // Course Management State
  const [courses, setCourses] = useState<HskCourse[]>([])
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<HskCourse | null>(null)
  const [courseForm, setCourseForm] = useState({
    name: '',
    level: 'HSK3',
    description: '',
    total_vocabulary: 300,
    total_lessons: 15,
  })

  // Sample data management state
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  // Initialize form once per authenticated user
  useEffect(() => {
    if (user && profile && initUserId !== user.id) {
      setDisplayName(profile.display_name ?? '')
      setHeight(profile.height_cm?.toString() ?? '')
      const activeTheme = (localStorage.getItem('mochi-theme') as 'light' | 'dark') || profile.theme || 'light'
      setTheme(activeTheme)
      setInitUserId(user.id)
    }
  }, [user, profile, initUserId])

  useEffect(() => {
    if (user) {
      loadCourses()
    }
  }, [user])

  async function loadCourses() {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase.from('hsk_courses').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setCourses(data ?? [])
  }

  async function handleThemeChange(newTheme: 'light' | 'dark') {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('mochi-theme', newTheme)

    if (!user) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ theme: newTheme })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      toast.warning('Đã đổi giao diện trên thiết bị này nhưng chưa thể đồng bộ với tài khoản.')
    } else {
      updateLocalProfile({ theme: newTheme })
      toast.success('Đã cập nhật giao diện thành công!')
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      toast.error('Vui lòng nhập tên hiển thị hợp lệ')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const heightVal = height ? Number(height) : null

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        display_name: trimmedName,
        height_cm: heightVal,
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST301') {
        toast.error('Lỗi quyền truy cập (RLS): Không thể cập nhật hồ sơ.')
      } else if (error.code === 'PGRST116') {
        // Missing profile row -> insert
        const { data: inserted, error: insertErr } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: trimmedName,
            height_cm: heightVal,
            theme,
          })
          .select()
          .single()
        if (insertErr || !inserted) {
          toast.error('Lỗi khi tạo mới hồ sơ: ' + (insertErr?.message || 'Không xác định'))
        } else {
          updateLocalProfile(inserted)
          toast.success('Đã lưu hồ sơ thành công!')
        }
      } else {
        toast.error('Lỗi lưu hồ sơ: ' + error.message)
      }
      setLoading(false)
      return
    }

    if (data) {
      updateLocalProfile({ display_name: trimmedName, height_cm: heightVal })
      toast.success('Đã lưu hồ sơ thành công!')
    }
    setLoading(false)
  }

  async function handleSetActiveCourse(courseId: string) {
    if (!user) return
    const supabase = createClient()
    await supabase.from('user_profiles').update({ active_hsk_course_id: courseId }).eq('user_id', user.id)
    toast.success('Đã thay đổi khóa học đang hoạt động!')
    window.location.reload()
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!courseForm.name.trim()) { toast.error('Vui lòng nhập tên khóa học'); return }

    const supabase = createClient()
    setLoading(true)

    if (editingCourse) {
      const { error } = await supabase.from('hsk_courses').update({
        name: courseForm.name,
        level: courseForm.level,
        description: courseForm.description,
        total_vocabulary: Number(courseForm.total_vocabulary) || 0,
        total_lessons: Number(courseForm.total_lessons) || 0,
      }).eq('id', editingCourse.id)

      if (error) toast.error('Lỗi: ' + error.message)
      else toast.success('Đã cập nhật khóa học!')
    } else {
      const { data: newCourse, error } = await supabase.from('hsk_courses').insert({
        user_id: user.id,
        name: courseForm.name,
        level: courseForm.level,
        description: courseForm.description,
        total_vocabulary: Number(courseForm.total_vocabulary) || 0,
        total_lessons: Number(courseForm.total_lessons) || 0,
      }).select().single()

      if (error) {
        toast.error('Lỗi: ' + error.message)
      } else {
        toast.success('Đã tạo khóa học mới!')
        if (courses.length === 0 && newCourse) {
          await supabase.from('user_profiles').update({ active_hsk_course_id: newCourse.id }).eq('user_id', user.id)
        }
      }
    }

    setLoading(false)
    setShowCourseModal(false)
    loadCourses()
  }

  async function handleDeleteCourse(courseId: string) {
    if (!user) return
    if (!confirm('Bạn có chắc chắn muốn xóa khóa học này? Toàn bộ từ vựng và bài học trong khóa học sẽ bị xóa.')) return
    const supabase = createClient()
    setLoading(true)

    const { error } = await supabase.from('hsk_courses').delete().eq('id', courseId)
    if (error) {
      toast.error('Lỗi khi xóa: ' + error.message)
    } else {
      toast.success('Đã xóa khóa học thành công!')
      if (profile?.active_hsk_course_id === courseId) {
        const remaining = courses.filter(c => c.id !== courseId)
        const nextActive = remaining[0]?.id || null
        await supabase.from('user_profiles').update({ active_hsk_course_id: nextActive }).eq('user_id', user.id)
      }
      loadCourses()
    }
    setLoading(false)
  }

  async function exportData() {
    if (!user) return
    setExportLoading(true)
    const supabase = createClient()
    try {
      const [profiles, wGoals, wLogs, exLogs, courses, vocab, grammar, sessions, txs, budgets, cats, wallets] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id),
        supabase.from('weight_goals').select('*').eq('user_id', user.id),
        supabase.from('weight_logs').select('*').eq('user_id', user.id),
        supabase.from('exercise_logs').select('*').eq('user_id', user.id),
        supabase.from('hsk_courses').select('*').eq('user_id', user.id),
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
        version: '3.0.0',
        user_id: user.id,
        data: {
          profile: profiles.data?.[0],
          weight_goals: wGoals.data,
          weight_logs: wLogs.data,
          exercise_logs: exLogs.data,
          hsk_courses: courses.data,
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
        supabase.from('hsk_courses').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('hsk_vocabulary').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('hsk_grammar').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('study_sessions').delete().eq('user_id', user.id).eq('is_sample_data', true),
        supabase.from('transactions').delete().eq('user_id', user.id).eq('is_sample_data', true),
      ])
      toast.success('Đã xóa dữ liệu mẫu!')
      setDeleteConfirm('')
      loadCourses()
    } catch (e) {
      toast.error('Có lỗi khi xóa dữ liệu mẫu')
    } finally {
      setLoading(false)
    }
  }

  async function handleReSeedSampleData() {
    if (!user) return
    const supabase = createClient()
    setLoading(true)
    try {
      const { seedSampleDataForUser } = await import('@/lib/seed-data')
      await seedSampleDataForUser(supabase, user.id, 'HSK3')
      toast.success('Đã khởi tạo lại dữ liệu mẫu!')
      loadCourses()
    } catch (e) {
      toast.error('Lỗi khi tạo dữ liệu mẫu')
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
    { id: 'courses', label: '📚 Khóa học' },
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
                <label className="mochi-label">Giao diện người dùng</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className={`mochi-btn ${theme === 'light' ? 'mochi-btn-primary' : 'mochi-btn-secondary'}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    ☀️ Sáng
                  </button>
                  <button
                    type="button"
                    className={`mochi-btn ${theme === 'dark' ? 'mochi-btn-primary' : 'mochi-btn-secondary'}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    🌙 Tối
                  </button>
                </div>
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

      {activeTab === 'courses' && (
        <div className="settings-section">
          <div className="mochi-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="section-title" style={{ margin: 0 }}>📚 Quản lý khóa học tiếng Trung</h2>
              <button
                className="mochi-btn mochi-btn-primary mochi-btn-sm"
                onClick={() => {
                  setEditingCourse(null)
                  setCourseForm({ name: '', level: 'HSK3', description: '', total_vocabulary: 300, total_lessons: 15 })
                  setShowCourseModal(true)
                }}
              >
                + Tạo khóa học mới
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="mochi-empty-state" style={{ padding: 24 }}>
                <div className="mascot">📚</div>
                <p>Chưa có khóa học nào. Hãy tạo khóa học đầu tiên!</p>
              </div>
            ) : (
              <div className="courses-list">
                {courses.map(c => {
                  const isActive = profile?.active_hsk_course_id === c.id
                  return (
                    <div key={c.id} className={`course-item-card ${isActive ? 'active-course' : ''}`}>
                      <div className="course-item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="course-level-badge">{c.level}</span>
                          <h3 className="course-item-title">{c.name}</h3>
                          {isActive && <span className="active-badge">Đang hoạt động</span>}
                        </div>
                        <p className="course-item-desc">{c.description || 'Chưa có mô tả'}</p>
                        <div className="course-item-stats">
                          <span>Mục tiêu từ vựng: {c.total_vocabulary}</span> · <span>Số bài học: {c.total_lessons}</span>
                        </div>
                      </div>

                      <div className="course-item-actions">
                        {!isActive && (
                          <button
                            className="mochi-btn mochi-btn-secondary mochi-btn-sm"
                            onClick={() => handleSetActiveCourse(c.id)}
                          >
                            Chọn làm khóa chính
                          </button>
                        )}
                        <button
                          className="mochi-btn mochi-btn-ghost mochi-btn-sm"
                          onClick={() => {
                            setEditingCourse(c)
                            setCourseForm({
                              name: c.name,
                              level: c.level,
                              description: c.description || '',
                              total_vocabulary: c.total_vocabulary,
                              total_lessons: c.total_lessons,
                            })
                            setShowCourseModal(true)
                          }}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          className="mochi-btn mochi-btn-danger mochi-btn-sm"
                          onClick={() => handleDeleteCourse(c.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
            <h2 className="section-title danger-title">⚠️ Dữ liệu mẫu</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--chocolate-400)', fontWeight: 600, marginBottom: 12 }}>
              Bạn có thể tạo lại hoặc xóa toàn bộ các bản ghi mẫu (có nhãn dữ liệu mẫu) bất kỳ lúc nào.
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button className="mochi-btn mochi-btn-secondary mochi-btn-sm" onClick={handleReSeedSampleData} disabled={loading}>
                ✨ Tạo lại dữ liệu mẫu
              </button>
            </div>
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
            <p className="about-version">Phiên bản 3.0.0</p>
            <p className="about-desc">Ứng dụng quản lý mục tiêu cuộc sống đa năng. Giúp bạn theo dõi giảm cân, học tiếng Trung đa cấp độ, quản lý tài chính & lên lịch biểu.</p>
            <div className="about-features">
              <div className="feature-item">💪 Giảm cân & Luyện tập</div>
              <div className="feature-item">🈶 Học tiếng Trung nhiều khóa học</div>
              <div className="feature-item">💰 Kiểm soát Chi tiêu & Giao dịch định kỳ</div>
              <div className="feature-item">📅 Lịch tổng hợp & Thành tích</div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--chocolate-300)', fontWeight: 600, marginTop: 8 }}>Made with 🐱 and love</p>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content animate-bounce-in" onClick={e => e.stopPropagation()}>
            <h2>{editingCourse ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}</h2>
            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="form-group">
                <label className="mochi-label">Tên khóa học *</label>
                <input
                  type="text"
                  className="mochi-input"
                  placeholder="Ví dụ: HSK 5 Standard Course"
                  value={courseForm.name}
                  onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="mochi-label">Cấp độ</label>
                <select
                  className="mochi-input"
                  value={courseForm.level}
                  onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}
                >
                  <option value="HSK1">HSK 1</option>
                  <option value="HSK2">HSK 2</option>
                  <option value="HSK3">HSK 3</option>
                  <option value="HSK4">HSK 4</option>
                  <option value="HSK5">HSK 5</option>
                  <option value="HSK6">HSK 6</option>
                  <option value="HSK7-9">HSK 7–9</option>
                  <option value="Custom">Tùy chỉnh</option>
                </select>
              </div>

              <div className="form-group">
                <label className="mochi-label">Mô tả</label>
                <input
                  type="text"
                  className="mochi-input"
                  placeholder="Mô tả ngắn gọn về khóa học"
                  value={courseForm.description}
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="mochi-label">Tổng từ vựng mục tiêu</label>
                  <input
                    type="number"
                    className="mochi-input"
                    value={courseForm.total_vocabulary}
                    onChange={e => setCourseForm({ ...courseForm, total_vocabulary: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="mochi-label">Số bài học</label>
                  <input
                    type="number"
                    className="mochi-input"
                    value={courseForm.total_lessons}
                    onChange={e => setCourseForm({ ...courseForm, total_lessons: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="mochi-btn mochi-btn-secondary" onClick={() => setShowCourseModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="mochi-btn mochi-btn-primary" disabled={loading}>
                  {loading ? 'Đang lưu...' : 'Lưu khóa học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page { max-width: 750px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .page-title { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .settings-tabs { display: flex; background: white; border-radius: 20px; padding: 4px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); gap: 4px; }
        .tab-btn { flex: 1; padding: 8px 12px; border: none; background: none; border-radius: 16px; font-weight: 700; font-size: 0.85rem; color: var(--chocolate-400); cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: var(--cheese-100); color: var(--chocolate-600); }
        .settings-section { display: flex; flex-direction: column; gap: 16px; }
        .section-title { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 16px; }
        .settings-form { display: flex; flex-direction: column; gap: 14px; }
        .danger-zone { background: white; border-radius: 24px; padding: 20px; border: 1.5px solid var(--peach-200); display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
        .danger-title { color: var(--peach-500); margin: 0 0 4px; font-size: 1rem; }
        .courses-list { display: flex; flex-direction: column; gap: 12px; }
        .course-item-card { background: var(--cream); border-radius: 18px; padding: 16px; border: 1.5px solid var(--chocolate-100); display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .course-item-card.active-course { border-color: var(--lavender-400); background: var(--lavender-50); }
        .course-level-badge { background: var(--lavender-400); color: white; font-weight: 800; font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; }
        .active-badge { background: var(--mint-400); color: white; font-weight: 800; font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; }
        .course-item-title { font-weight: 800; font-size: 0.95rem; margin: 0; color: var(--chocolate-600); }
        .course-item-desc { font-size: 0.8rem; color: var(--chocolate-400); margin: 2px 0 4px; }
        .course-item-stats { font-size: 0.75rem; color: var(--chocolate-500); font-weight: 600; }
        .course-item-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-content { background: white; border-radius: 24px; padding: 24px; max-width: 500px; width: 100%; box-shadow: var(--shadow-lg); }
        .confirm-input-group { display: flex; gap: 8px; margin-top: 8px; }
      `}</style>
    </div>
  )
}
