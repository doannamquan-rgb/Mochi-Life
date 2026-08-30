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
  const [defaultThinkingMode, setDefaultThinkingMode] = useState<'fast' | 'balanced' | 'deep'>('balanced')
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

  // Backup & Restore State
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreValidation, setRestoreValidation] = useState<any | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreConfirmText, setRestoreConfirmText] = useState('')

  async function exportData() {
    if (!user) return
    setExportLoading(true)
    try {
      const { generateFullBackup } = await import('@/lib/backup')
      const backup = await generateFullBackup(user.id)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mochi-life-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã sao lưu toàn bộ dữ liệu (23 bảng) thành công! 🐱💾')
    } catch (e: any) {
      console.error('Export error:', e)
      toast.error('Có lỗi khi xuất dữ liệu: ' + (e?.message || 'Không xác định'))
    } finally {
      setExportLoading(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const { validateBackupData } = await import('@/lib/backup')
      const validation = validateBackupData(json)

      if (!validation.valid) {
        toast.error(validation.error || 'File không hợp lệ!')
        return
      }

      setRestoreValidation(validation)
      setRestoreConfirmText('')
      setShowRestoreModal(true)
    } catch (err: any) {
      toast.error('File không đúng định dạng JSON: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  async function handleExecuteRestore() {
    if (!user || !restoreValidation?.parsed) return
    if (restoreConfirmText !== 'KHOI PHUC') {
      toast.error('Vui lòng nhập chính xác "KHOI PHUC" để xác nhận!')
      return
    }

    setRestoreLoading(true)
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoreValidation.parsed),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        toast.error(result.error || 'Khôi phục dữ liệu thất bại!')
        return
      }

      const { notifyDataChanged } = await import('@/lib/events')
      notifyDataChanged('all', 'restore')

      toast.success('🎉 Khôi phục dữ liệu thành công! Đang tải lại...')
      setShowRestoreModal(false)
      setRestoreValidation(null)
      loadCourses()
      setTimeout(() => window.location.reload(), 1200)
    } catch (err: any) {
      toast.error('Lỗi kết nối khi khôi phục: ' + err.message)
    } finally {
      setRestoreLoading(false)
    }
  }

  // Initialize form once per authenticated user
  useEffect(() => {
    if (user && profile && initUserId !== user.id) {
      setDisplayName(profile.display_name ?? '')
      setHeight(profile.height_cm?.toString() ?? '')
      const activeTheme = (localStorage.getItem('mochi-theme') as 'light' | 'dark') || profile.theme || 'light'
      setTheme(activeTheme)
      const activeAiMode = (localStorage.getItem('mochi-ai-thinking-mode') as 'fast' | 'balanced' | 'deep') || 'balanced'
      setDefaultThinkingMode(activeAiMode)
      setInitUserId(user.id)
    }
  }, [user, profile, initUserId])

  function handleThinkingModeChange(mode: 'fast' | 'balanced' | 'deep') {
    setDefaultThinkingMode(mode)
    localStorage.setItem('mochi-ai-thinking-mode', mode)
    const labels = {
      fast: '⚡ Đã đặt chế độ Siêu tốc (Fast) làm mặc định',
      balanced: '⚖️ Đã đặt chế độ Cân bằng (Balanced) làm mặc định',
      deep: '🧠 Đã đặt chế độ Suy luận sâu (Deep Reasoning) làm mặc định',
    }
    toast.success(labels[mode])
  }

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
                <label className="mochi-label">Chế độ AI Thinking mặc định (Gemini 3.7 Flash)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <button
                    type="button"
                    className={`mochi-btn ${defaultThinkingMode === 'fast' ? 'mochi-btn-primary' : 'mochi-btn-secondary'}`}
                    onClick={() => handleThinkingModeChange('fast')}
                    style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                  >
                    ⚡ Siêu tốc
                  </button>
                  <button
                    type="button"
                    className={`mochi-btn ${defaultThinkingMode === 'balanced' ? 'mochi-btn-primary' : 'mochi-btn-secondary'}`}
                    onClick={() => handleThinkingModeChange('balanced')}
                    style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                  >
                    ⚖️ Cân bằng
                  </button>
                  <button
                    type="button"
                    className={`mochi-btn ${defaultThinkingMode === 'deep' ? 'mochi-btn-primary' : 'mochi-btn-secondary'}`}
                    onClick={() => handleThinkingModeChange('deep')}
                    style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                  >
                    🧠 Suy luận sâu
                  </button>
                </div>
                <span className="field-hint">
                  {defaultThinkingMode === 'fast' && '⚡ Tắt suy nghĩ, phản hồi siêu tốc với độ trễ thấp nhất.'}
                  {defaultThinkingMode === 'balanced' && '⚖️ Gemini tự động cân bằng giữa thời gian suy nghĩ và logic (Mặc định).'}
                  {defaultThinkingMode === 'deep' && '🧠 Cho phép AI suy nghĩ & đối chiếu dữ liệu nhiều bước trước khi trả lời.'}
                </span>
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
            <div className="data-actions" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="data-action-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div className="da-info">
                  <div className="da-title" style={{ fontWeight: 800, color: 'var(--chocolate-600)' }}>📥 Sao lưu toàn bộ dữ liệu</div>
                  <div className="da-desc" style={{ fontSize: '0.85rem', color: 'var(--chocolate-400)' }}>Tải về file JSON chuẩn (23 bảng dữ liệu)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--chocolate-300)', marginTop: 4 }}>
                    ⚠️ Không bao gồm file ảnh đã tải lên storage (avatar, ảnh cân nặng, hóa đơn).
                  </div>
                </div>
                <button className="mochi-btn mochi-btn-primary mochi-btn-sm" onClick={exportData} disabled={exportLoading}>
                  {exportLoading ? 'Đang xuất...' : '📥 Tải về JSON'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--chocolate-100)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div className="da-info">
                  <div className="da-title" style={{ fontWeight: 800, color: 'var(--chocolate-600)' }}>📤 Khôi phục từ file sao lưu</div>
                  <div className="da-desc" style={{ fontSize: '0.85rem', color: 'var(--chocolate-400)' }}>Nạp lại toàn bộ dữ liệu từ file JSON sao lưu trước đó</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--peach-500)', marginTop: 4, fontWeight: 700 }}>
                    ⚠️ Thao tác này sẽ thay thế toàn bộ dữ liệu hiện tại bằng dữ liệu trong file backup.
                  </div>
                </div>
                <label className="mochi-btn mochi-btn-secondary mochi-btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', margin: 0 }}>
                  <span>📤 Chọn file JSON</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
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
          {/* App Info Card */}
          <div className="mochi-card about-card" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span className="animate-float" style={{ fontSize: '3.5rem' }}>🐱</span>
            <h2 className="about-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--chocolate-600)', margin: 0 }}>Mochi Life</h2>
            <div style={{ background: 'var(--lavender-100)', color: 'var(--lavender-600)', padding: '4px 14px', borderRadius: 999, fontWeight: 800, fontSize: '0.85rem' }}>
              Phiên bản 6.1.1 (build 6.1.1.26) • Cross-Platform Ecosystem
            </div>
            <p className="about-desc" style={{ fontSize: '0.9rem', color: 'var(--chocolate-400)', fontWeight: 600, maxWidth: 500, margin: 0 }}>
              Ứng dụng quản lý mục tiêu cuộc sống đa năng. Giúp bạn theo dõi giảm cân, học tiếng Trung đa cấp độ, quản lý tài chính & lên lịch biểu.
            </p>
            <div className="about-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', marginTop: 8 }}>
              <div className="feature-item" style={{ background: 'var(--cream)', padding: '10px 12px', borderRadius: 14, fontWeight: 700, fontSize: '0.8rem', color: 'var(--chocolate-600)', border: '1px solid var(--chocolate-100)' }}>💪 Giảm cân & Luyện tập</div>
              <div className="feature-item" style={{ background: 'var(--cream)', padding: '10px 12px', borderRadius: 14, fontWeight: 700, fontSize: '0.8rem', color: 'var(--chocolate-600)', border: '1px solid var(--chocolate-100)' }}>🈶 Học tiếng Trung nhiều khóa</div>
              <div className="feature-item" style={{ background: 'var(--cream)', padding: '10px 12px', borderRadius: 14, fontWeight: 700, fontSize: '0.8rem', color: 'var(--chocolate-600)', border: '1px solid var(--chocolate-100)' }}>💰 Kiểm soát Chi tiêu định kỳ</div>
              <div className="feature-item" style={{ background: 'var(--cream)', padding: '10px 12px', borderRadius: 14, fontWeight: 700, fontSize: '0.8rem', color: 'var(--chocolate-600)', border: '1px solid var(--chocolate-100)' }}>📅 Lịch tổng hợp & Thành tích</div>
            </div>
          </div>

          {/* Author & Contact Card */}
          <div className="mochi-card author-card" style={{ padding: 28, background: 'linear-gradient(135deg, #FFFDF9, #F5F2FF)', border: '1.5px solid var(--lavender-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #8F71F5, #FF7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: 'white', boxShadow: 'var(--shadow-sm)' }}>
                👨‍💻
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--chocolate-600)' }}>Tác giả & Phát triển</h3>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--lavender-500)', marginTop: 2 }}>Đoàn Nam Quân</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a
                href="https://www.facebook.com/doannamquan/"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-btn fb-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: 16,
                  background: '#1877F2',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.3rem' }}>📘</span>
                  <span>Facebook Tác Giả</span>
                </div>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>@doannamquan ↗</span>
              </a>

              <div
                className="contact-btn mail-btn"
                onClick={() => {
                  navigator.clipboard.writeText('doannamquan@gmail.com')
                  toast.success('📋 Đã sao chép email doannamquan@gmail.com vào khay nhớ tạm!')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: 16,
                  background: 'white',
                  border: '1.5px solid var(--chocolate-200)',
                  color: 'var(--chocolate-600)',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.3rem' }}>✉️</span>
                  <div>
                    <div>Email Liên hệ</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--chocolate-400)', fontWeight: 600 }}>doannamquan@gmail.com</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--lavender-500)', background: 'var(--lavender-50)', padding: '4px 10px', borderRadius: 999 }}>Sao chép 📋</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--chocolate-300)', fontWeight: 600, marginTop: 20 }}>
              Made with 🐱 and ❤️ by Đoàn Nam Quân
            </div>
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

      {/* Restore Confirmation Modal */}
      {showRestoreModal && restoreValidation && (
        <div className="modal-overlay" onClick={() => !restoreLoading && setShowRestoreModal(false)}>
          <div className="modal-content animate-bounce-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <h2 style={{ margin: 0, color: 'var(--peach-600)', fontSize: '1.25rem', fontWeight: 800 }}>
                Xác nhận khôi phục dữ liệu
              </h2>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--chocolate-500)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Bản sao lưu chứa <strong>{restoreValidation.totalRecords}</strong> bản ghi.
              Khôi phục sẽ <strong>thay thế toàn bộ dữ liệu hiện tại</strong> của bạn bằng dữ liệu từ file này.
            </p>

            {restoreValidation.summary && (
              <div style={{
                background: 'var(--cream)',
                borderRadius: 14,
                padding: '12px 16px',
                maxHeight: 180,
                overflowY: 'auto',
                fontSize: '0.8rem',
                border: '1px solid var(--chocolate-100)',
                marginBottom: 16,
              }}>
                <div style={{ fontWeight: 800, color: 'var(--chocolate-600)', marginBottom: 6 }}>
                  📋 Chi tiết các bảng dữ liệu:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                  {Object.entries(restoreValidation.summary).map(([tbl, cnt]) => (
                    <div key={tbl} style={{ color: 'var(--chocolate-500)' }}>
                      • <strong>{tbl}</strong>: {cnt as number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              background: '#FFF0F0',
              borderRadius: 14,
              padding: '12px 16px',
              border: '1.5px solid #FFD0D0',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D32F2F', marginBottom: 6 }}>
                Để tiếp tục, vui lòng nhập chính xác &quot;KHOI PHUC&quot;:
              </div>
              <input
                type="text"
                className="mochi-input"
                placeholder='Nhập "KHOI PHUC"'
                value={restoreConfirmText}
                onChange={e => setRestoreConfirmText(e.target.value)}
                disabled={restoreLoading}
                style={{ borderColor: '#FFB0B0', background: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="mochi-btn mochi-btn-secondary"
                onClick={() => setShowRestoreModal(false)}
                disabled={restoreLoading}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="mochi-btn mochi-btn-danger"
                onClick={handleExecuteRestore}
                disabled={restoreConfirmText !== 'KHOI PHUC' || restoreLoading}
              >
                {restoreLoading ? 'Đang khôi phục...' : '💥 Xác nhận khôi phục'}
              </button>
            </div>
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
