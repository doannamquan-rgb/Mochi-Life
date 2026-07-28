'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { HskCourse, DataImportJob } from '@/lib/types'
import { toast } from 'sonner'

type DuplicateStrategy = 'skip' | 'update' | 'insert'

type ParsedRow = {
  hanzi: string
  pinyin: string
  meaning: string
  word_type?: string
  example_cn?: string
  example_pinyin?: string
  example_vi?: string
  topic?: string
  level?: string
  note?: string
  isValid: boolean
  errorMsg?: string
}

export default function ImportPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<HskCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [newCourseName, setNewCourseName] = useState<string>('')
  const [newCourseLevel, setNewCourseLevel] = useState<string>('HSK3')
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false)

  // Input modes
  const [activeTab, setActiveTab] = useState<'csv' | 'paste' | 'url' | 'history'>('csv')
  const [rawText, setRawText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip')

  // Parsing & batch state
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importJobs, setImportJobs] = useState<DataImportJob[]>([])
  const [importingProgress, setImportingProgress] = useState<{ current: number; total: number } | null>(null)

  useEffect(() => {
    if (!user) return
    loadCoursesAndHistory()
  }, [user])

  async function loadCoursesAndHistory() {
    if (!user) return
    const supabase = createClient()
    const [cRes, jRes] = await Promise.all([
      supabase.from('hsk_courses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('data_import_jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ])

    const cList = cRes.data ?? []
    setCourses(cList)
    if (cList.length > 0 && !selectedCourseId) {
      setSelectedCourseId(cList[0].id)
    }
    setImportJobs(jRes.data ?? [])
  }

  function parseCSVContent(csvText: string) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length === 0) {
      toast.error('File hoặc nội dung CSV rỗng')
      return
    }

    // Handle header row & column mapping
    const headerLine = lines[0].toLowerCase()
    const hasHeader = headerLine.includes('hanzi') || headerLine.includes('chinese') || headerLine.includes('pinyin') || headerLine.includes('meaning')
    const startIdx = hasHeader ? 1 : 0

    const rows: ParsedRow[] = []

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim())
      const hanzi = cols[0] || ''
      const pinyin = cols[1] || ''
      const meaning = cols[2] || ''
      const word_type = cols[3] || ''
      const example_cn = cols[4] || ''
      const example_vi = cols[5] || ''
      const level = cols[6] || ''

      const isValid = hanzi.length > 0 && pinyin.length > 0 && meaning.length > 0
      const errorMsg = !isValid ? 'Thiếu chữ Hán, Pinyin hoặc Ý nghĩa' : undefined

      rows.push({
        hanzi,
        pinyin,
        meaning,
        word_type,
        example_cn,
        example_vi,
        level,
        isValid,
        errorMsg,
      })
    }

    setParsedRows(rows)
    toast.success(`Đã đọc ${rows.length} dòng dữ liệu (${rows.filter(r => r.isValid).length} dòng hợp lệ)`)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      if (text) parseCSVContent(text)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleFetchURL() {
    if (!urlInput.trim()) { toast.error('Vui lòng nhập URL'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Tải dữ liệu từ URL thất bại')
      } else {
        parseCSVContent(data.content)
        toast.success('Đã tải thành công file từ URL!')
      }
    } catch (e: any) {
      toast.error('Lỗi khi gửi yêu cầu URL')
    } finally {
      setLoading(false)
    }
  }

  async function handleExecuteImport() {
    if (!user) return
    const validRows = parsedRows.filter(r => r.isValid)
    if (validRows.length === 0) {
      toast.error('Không có dòng dữ liệu hợp lệ để nhập')
      return
    }

    const supabase = createClient()
    setLoading(true)
    let targetCourseId = selectedCourseId

    // 1. If creating a new course in flow
    if (isCreatingNewCourse || !targetCourseId) {
      if (!newCourseName.trim()) {
        toast.error('Vui lòng nhập tên khóa học mới')
        setLoading(false)
        return
      }
      const { data: newCourse, error: cErr } = await supabase.from('hsk_courses').insert({
        user_id: user.id,
        name: newCourseName,
        level: newCourseLevel,
        total_vocabulary: validRows.length,
      }).select().single()

      if (cErr || !newCourse) {
        toast.error('Không thể tạo khóa học mới: ' + cErr?.message)
        setLoading(false)
        return
      }
      targetCourseId = newCourse.id
      await supabase.from('user_profiles').update({ active_hsk_course_id: newCourse.id }).eq('user_id', user.id)
    }

    // 2. Create Data Import Job log
    const { data: job } = await supabase.from('data_import_jobs').insert({
      user_id: user.id,
      source_url: activeTab === 'url' ? urlInput : 'Tải lên trực tiếp / Dán text',
      source_type: activeTab === 'url' ? 'url' : activeTab === 'csv' ? 'csv' : 'paste',
      status: 'processing',
    }).select().single()

    let importedCount = 0
    let failedCount = 0

    // Batch insertion (batch size 20)
    const BATCH_SIZE = 20
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)
      setImportingProgress({ current: Math.min(i + BATCH_SIZE, validRows.length), total: validRows.length })

      for (const row of batch) {
        try {
          if (duplicateStrategy === 'skip') {
            const { data: existing } = await supabase
              .from('hsk_vocabulary')
              .select('id')
              .eq('user_id', user.id)
              .eq('course_id', targetCourseId)
              .eq('hanzi', row.hanzi)
              .maybeSingle()

            if (existing) continue
          }

          if (duplicateStrategy === 'update') {
            const { data: existing } = await supabase
              .from('hsk_vocabulary')
              .select('id')
              .eq('user_id', user.id)
              .eq('course_id', targetCourseId)
              .eq('hanzi', row.hanzi)
              .maybeSingle()

            if (existing) {
              await supabase.from('hsk_vocabulary').update({
                pinyin: row.pinyin,
                meaning: row.meaning,
                word_type: row.word_type || null,
                example_cn: row.example_cn || null,
                example_vi: row.example_vi || null,
              }).eq('id', existing.id)
              importedCount++
              continue
            }
          }

          // Insert new
          await supabase.from('hsk_vocabulary').insert({
            user_id: user.id,
            course_id: targetCourseId,
            hanzi: row.hanzi,
            pinyin: row.pinyin,
            meaning: row.meaning,
            word_type: row.word_type || null,
            example_cn: row.example_cn || null,
            example_vi: row.example_vi || null,
          })
          importedCount++
        } catch {
          failedCount++
        }
      }
    }

    // Update course totals
    const { count: vocabTotalCount } = await supabase
      .from('hsk_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', targetCourseId)

    if (vocabTotalCount !== null) {
      await supabase.from('hsk_courses').update({ total_vocabulary: vocabTotalCount }).eq('id', targetCourseId)
    }

    // Update job log
    if (job) {
      await supabase.from('data_import_jobs').update({
        status: 'completed',
        vocabulary_imported: importedCount,
        error_message: failedCount > 0 ? `${failedCount} dòng bị lỗi` : null,
      }).eq('id', job.id)
    }

    toast.success(`Nhập dữ liệu thành công! Đã thêm ${importedCount} từ vựng vào khóa học.`)
    setLoading(false)
    setImportingProgress(null)
    setParsedRows([])
    loadCoursesAndHistory()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/chinese" className="back-link">← Tiếng Trung</Link>
            <h1 className="page-title">📥 Nhập dữ liệu HSK</h1>
          </div>
          <p className="page-subtitle">Nhập từ vựng & bài học từ file CSV hoặc đường dẫn URL công khai</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="import-tabs">
        <button className={`tab-btn ${activeTab === 'csv' ? 'active' : ''}`} onClick={() => setActiveTab('csv')}>
          📄 Upload file CSV
        </button>
        <button className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`} onClick={() => setActiveTab('paste')}>
          📝 Dán văn bản CSV
        </button>
        <button className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`} onClick={() => setActiveTab('url')}>
          🌐 Nhập từ URL
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📜 Lịch sử nhập dữ liệu
        </button>
      </div>

      {activeTab !== 'history' && (
        <div className="import-config-card mochi-card">
          <h2 className="section-title">1. Chọn khóa học đích & Cấu hình trùng lặp</h2>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="mochi-label">Khóa học đích</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {!isCreatingNewCourse ? (
                <select
                  className="mochi-input"
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                  <input
                    type="text"
                    className="mochi-input"
                    placeholder="Tên khóa học mới"
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                  />
                  <select
                    className="mochi-input"
                    style={{ width: 120 }}
                    value={newCourseLevel}
                    onChange={e => setNewCourseLevel(e.target.value)}
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
              )}

              <button
                type="button"
                className="mochi-btn mochi-btn-secondary mochi-btn-sm"
                onClick={() => setIsCreatingNewCourse(!isCreatingNewCourse)}
              >
                {isCreatingNewCourse ? 'Chọn khóa có sẵn' : '+ Tạo khóa học mới'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="mochi-label">Xử lý khi phát hiện từ vựng trùng lặp</label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`mochi-btn ${duplicateStrategy === 'skip' ? 'mochi-btn-primary' : 'mochi-btn-secondary'} mochi-btn-sm`}
                onClick={() => setDuplicateStrategy('skip')}
              >
                Bỏ qua
              </button>
              <button
                type="button"
                className={`mochi-btn ${duplicateStrategy === 'update' ? 'mochi-btn-primary' : 'mochi-btn-secondary'} mochi-btn-sm`}
                onClick={() => setDuplicateStrategy('update')}
              >
                Cập nhật
              </button>
              <button
                type="button"
                className={`mochi-btn ${duplicateStrategy === 'insert' ? 'mochi-btn-primary' : 'mochi-btn-secondary'} mochi-btn-sm`}
                onClick={() => setDuplicateStrategy('insert')}
              >
                Thêm bản ghi mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'csv' && (
        <div className="mochi-card dropzone-card">
          <span style={{ fontSize: '3rem' }}>📄</span>
          <h3>Kéo thả file CSV vào đây hoặc click để chọn file</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--chocolate-400)' }}>
            Định dạng header khuyên dùng: <code>hanzi,pinyin,meaning,word_type,example_cn,example_vi,level</code>
          </p>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="file-input-hidden" />
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="mochi-card" style={{ padding: 20 }}>
          <label className="mochi-label">Dán nội dung CSV vào ô dưới đây:</label>
          <textarea
            className="mochi-input"
            rows={8}
            placeholder={`hanzi,pinyin,meaning,word_type,example_cn,example_vi,level\n学习,xuéxí,học tập,động từ,我每天学习中文。,Tôi học tiếng Trung mỗi ngày.,HSK3`}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          <button
            className="mochi-btn mochi-btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => parseCSVContent(rawText)}
          >
            🔍 Xem trước dữ liệu
          </button>
        </div>
      )}

      {activeTab === 'url' && (
        <div className="mochi-card" style={{ padding: 20 }}>
          <label className="mochi-label">Đường dẫn URL công khai đến file CSV hoặc JSON:</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <input
              type="url"
              className="mochi-input"
              placeholder="https://example.com/hsk3_vocabulary.csv"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
            />
            <button
              className="mochi-btn mochi-btn-primary"
              onClick={handleFetchURL}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : '🌐 Tải từ URL'}
            </button>
          </div>
          <span className="field-hint">Mochi Life hỗ trợ bảo vệ SSRF nâng cao, ngăn chặn các yêu cầu đến IP nội bộ.</span>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="mochi-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              2. Xem trước & Xác nhận ({parsedRows.filter(r => r.isValid).length}/{parsedRows.length} hợp lệ)
            </h2>
            <button
              className="mochi-btn mochi-btn-primary mochi-btn-lg"
              onClick={handleExecuteImport}
              disabled={loading}
            >
              {loading
                ? `Đang nhập... (${importingProgress?.current ?? 0}/${importingProgress?.total ?? 0})`
                : '🚀 Bắt đầu nhập dữ liệu'
              }
            </button>
          </div>

          <div className="table-responsive">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Chữ Hán (Hanzi)</th>
                  <th>Pinyin</th>
                  <th>Ý nghĩa</th>
                  <th>Loại từ</th>
                  <th>Ví dụ (Trung)</th>
                  <th>Ví dụ (Việt)</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map((r, idx) => (
                  <tr key={idx} className={r.isValid ? 'row-valid' : 'row-invalid'}>
                    <td>
                      {r.isValid ? (
                        <span className="status-badge valid">Hợp lệ</span>
                      ) : (
                        <span className="status-badge invalid">{r.errorMsg}</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.hanzi}</td>
                    <td>{r.pinyin}</td>
                    <td>{r.meaning}</td>
                    <td>{r.word_type || '–'}</td>
                    <td>{r.example_cn || '–'}</td>
                    <td>{r.example_vi || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 50 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--chocolate-400)', textAlign: 'center', marginTop: 12 }}>
                Hiển thị 50 dòng đầu tiên (Tổng số: {parsedRows.length} dòng)
              </p>
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="mochi-card" style={{ padding: 20 }}>
          <h2 className="section-title">Lịch sử nhập dữ liệu</h2>
          {importJobs.length === 0 ? (
            <div className="mochi-empty-state" style={{ padding: 20 }}>
              <p>Chưa có lịch sử nhập dữ liệu nào</p>
            </div>
          ) : (
            <div className="history-list">
              {importJobs.map(job => (
                <div key={job.id} className="history-item">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Nguồn: {job.source_url || job.source_type}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--chocolate-400)' }}>
                      Thời gian: {new Date(job.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--mint-500)' }}>+{job.vocabulary_imported} từ vựng</div>
                    <span className="status-badge valid">{job.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
        .back-link { text-decoration: none; font-size: 0.85rem; font-weight: 700; color: var(--chocolate-400); }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 4px 0 0; }
        .import-tabs { display: flex; background: white; border-radius: 20px; padding: 4px; box-shadow: var(--shadow-sm); border: 1.5px solid var(--chocolate-100); gap: 4px; overflow-x: auto; }
        .tab-btn { flex: 1; min-width: 130px; padding: 8px 12px; border: none; background: none; border-radius: 16px; font-weight: 700; font-size: 0.85rem; color: var(--chocolate-400); cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .tab-btn.active { background: var(--cheese-100); color: var(--chocolate-600); }
        .import-config-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .section-title { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .dropzone-card { padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; border: 2px dashed var(--chocolate-200); }
        .file-input-hidden { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .table-responsive { overflow-x: auto; margin-top: 12px; }
        .preview-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .preview-table th, .preview-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--chocolate-100); }
        .preview-table th { background: var(--cream); font-weight: 800; color: var(--chocolate-600); }
        .status-badge { font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
        .status-badge.valid { background: var(--mint-100); color: var(--mint-500); }
        .status-badge.invalid { background: var(--peach-100); color: var(--peach-500); }
        .history-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--cream); border-radius: 16px; border: 1px solid var(--chocolate-100); }
      `}</style>
    </div>
  )
}
