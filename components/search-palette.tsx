'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { Command } from 'cmdk'
import { formatTransactionAmount } from '@/lib/format'

type SearchResultItem = {
  id: string
  title: string
  subtitle?: string
  category: 'fitness' | 'study' | 'expense' | 'general'
  href: string
}

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const { user } = useUser()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResultItem[]>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      performSearch(query)
    }, 250)

    return () => clearTimeout(timer)
  }, [query, user])

  async function performSearch(searchTerm: string) {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const term = `%${searchTerm}%`
    const items: SearchResultItem[] = []

    try {
      const [vocabRes, grammarRes, lessonRes, courseRes, txRes, exRes, weightRes] = await Promise.all([
        supabase.from('hsk_vocabulary').select('id, hanzi, pinyin, meaning').eq('user_id', user.id).or(`hanzi.ilike.${term},pinyin.ilike.${term},meaning.ilike.${term}`).limit(5),
        supabase.from('hsk_grammar').select('id, structure_name, meaning').eq('user_id', user.id).or(`structure_name.ilike.${term},meaning.ilike.${term}`).limit(5),
        supabase.from('hsk_lessons').select('id, title, lesson_number').eq('user_id', user.id).ilike('title', term).limit(5),
        supabase.from('hsk_courses').select('id, name, level').eq('user_id', user.id).ilike('name', term).limit(5),
        supabase.from('transactions').select('id, description, amount, type').eq('user_id', user.id).ilike('description', term).limit(5),
        supabase.from('exercise_logs').select('id, exercise_type, note').eq('user_id', user.id).or(`exercise_type.ilike.${term},note.ilike.${term}`).limit(5),
        supabase.from('weight_logs').select('id, weight, note, log_date').eq('user_id', user.id).ilike('note', term).limit(5),
      ])

      // Vocabulary
      ;(vocabRes.data ?? []).forEach((v: any) => {
        items.push({
          id: v.id,
          title: `${v.hanzi} (${v.pinyin})`,
          subtitle: v.meaning,
          category: 'study',
          href: '/chinese/vocabulary',
        })
      })

      // Grammar
      ;(grammarRes.data ?? []).forEach((g: any) => {
        items.push({
          id: g.id,
          title: `Ngữ pháp: ${g.structure_name}`,
          subtitle: g.meaning,
          category: 'study',
          href: '/chinese/grammar',
        })
      })

      // Lessons
      ;(lessonRes.data ?? []).forEach((l: any) => {
        items.push({
          id: l.id,
          title: `Bài học: ${l.title}`,
          subtitle: `Bài ${l.lesson_number}`,
          category: 'study',
          href: '/chinese/lessons',
        })
      })

      // Courses
      ;(courseRes.data ?? []).forEach((c: any) => {
        items.push({
          id: c.id,
          title: `Khóa học: ${c.name}`,
          subtitle: `Cấp độ ${c.level}`,
          category: 'study',
          href: '/chinese',
        })
      })

      // Transactions
      ;(txRes.data ?? []).forEach((t: any) => {
        items.push({
          id: t.id,
          title: `${t.type === 'expense' ? 'Giao dịch chi' : 'Giao dịch thu'}: ${t.description || 'Giao dịch'}`,
          subtitle: formatTransactionAmount(t.amount, t.type),
          category: 'expense',
          href: '/expenses',
        })
      })

      // Exercises
      ;(exRes.data ?? []).forEach((e: any) => {
        items.push({
          id: e.id,
          title: `Luyện tập: ${e.exercise_type}`,
          subtitle: e.note || 'Ghi chép buổi tập',
          category: 'fitness',
          href: '/fitness',
        })
      })

      // Weight
      ;(weightRes.data ?? []).forEach((w: any) => {
        items.push({
          id: w.id,
          title: `Cân nặng: ${w.weight} kg (${w.log_date})`,
          subtitle: w.note || 'Nhật ký cân nặng',
          category: 'fitness',
          href: '/fitness',
        })
      })
    } catch (e) {
      console.error(e)
    }

    setResults(items)
    setLoading(false)
  }

  function handleSelect(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  if (!open) return null

  return (
    <div className="command-palette-overlay" onClick={() => onOpenChange(false)}>
      <div className="command-palette-container" onClick={e => e.stopPropagation()}>
        <Command label="Tìm kiếm toàn cục">
          <div className="search-input-header">
            <span className="search-icon">🔍</span>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Tìm kiếm từ vựng, giao dịch, bài học, luyện tập..."
              className="command-input"
              autoFocus
            />
            <span className="kbd-shortcut">ESC</span>
          </div>

          <Command.List className="command-list">
            {loading && <div className="command-loading">Đang tìm kiếm...</div>}

            {!loading && query.trim() !== '' && results.length === 0 && (
              <div className="command-empty">Không tìm thấy kết quả</div>
            )}

            {!loading && results.length > 0 && (
              <>
                <Command.Group heading="Học tập">
                  {results.filter(r => r.category === 'study').map(item => (
                    <Command.Item key={item.id} onSelect={() => handleSelect(item.href)} className="command-item">
                      <div>
                        <div className="item-title">{item.title}</div>
                        {item.subtitle && <div className="item-sub">{item.subtitle}</div>}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Tài chính">
                  {results.filter(r => r.category === 'expense').map(item => (
                    <Command.Item key={item.id} onSelect={() => handleSelect(item.href)} className="command-item">
                      <div>
                        <div className="item-title">{item.title}</div>
                        {item.subtitle && <div className="item-sub">{item.subtitle}</div>}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Sức khỏe">
                  {results.filter(r => r.category === 'fitness').map(item => (
                    <Command.Item key={item.id} onSelect={() => handleSelect(item.href)} className="command-item">
                      <div>
                        <div className="item-title">{item.title}</div>
                        {item.subtitle && <div className="item-sub">{item.subtitle}</div>}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}

            <Command.Group heading="Truy cập nhanh">
              <Command.Item onSelect={() => handleSelect('/dashboard')} className="command-item">
                🏠 Trang chủ Tổng quan
              </Command.Item>
              <Command.Item onSelect={() => handleSelect('/ai')} className="command-item">
                🐱 Mochi AI Coach
              </Command.Item>
              <Command.Item onSelect={() => handleSelect('/fitness')} className="command-item">
                💪 Giảm cân & Luyện tập
              </Command.Item>
              <Command.Item onSelect={() => handleSelect('/chinese')} className="command-item">
                🈶 Học tiếng Trung
              </Command.Item>
              <Command.Item onSelect={() => handleSelect('/expenses')} className="command-item">
                💰 Quản lý Chi tiêu
              </Command.Item>
              <Command.Item onSelect={() => handleSelect('/calendar')} className="command-item">
                📅 Lịch tổng hợp
              </Command.Item>
              <Command.Item onSelect={() => handleSelect('/achievements')} className="command-item">
                🏆 Thành tích & Cấp độ
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>

      <style jsx global>{`
        .command-palette-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; backdrop-filter: blur(2px); }
        .command-palette-container { background: white; border-radius: 24px; max-width: 600px; width: 100%; box-shadow: var(--shadow-xl); overflow: hidden; border: 1.5px solid var(--chocolate-100); }
        .search-input-header { display: flex; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--chocolate-100); gap: 12px; }
        .search-icon { font-size: 1.2rem; }
        .command-input { flex: 1; border: none; outline: none; font-size: 1rem; font-weight: 700; color: var(--chocolate-600); background: transparent; }
        .kbd-shortcut { font-size: 0.7rem; font-weight: 800; background: var(--chocolate-100); padding: 2px 6px; border-radius: 6px; color: var(--chocolate-400); }
        .command-list { max-height: 380px; overflow-y: auto; padding: 12px; }
        .command-loading, .command-empty { padding: 16px; text-align: center; font-size: 0.875rem; font-weight: 600; color: var(--chocolate-400); }
        [cmdk-group-heading] { font-size: 0.75rem; font-weight: 800; color: var(--chocolate-300); padding: 8px 12px 4px; text-transform: uppercase; }
        .command-item { padding: 10px 14px; border-radius: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s; }
        .command-item[data-selected="true"] { background: var(--cheese-100); color: var(--chocolate-700); }
        .item-title { font-weight: 700; font-size: 0.88rem; color: var(--chocolate-600); }
        .item-sub { font-size: 0.75rem; color: var(--chocolate-400); margin-top: 2px; }
      `}</style>
    </div>
  )
}
