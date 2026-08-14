'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { MODULE_CATEGORY_LABELS, formatVNDCompact } from '@/lib/format'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { useDataChanged } from '@/hooks/use-data-changed'
import { useCallback } from 'react'

type CalendarEvent = {
  id: string
  date: string
  title: string
  category: 'fitness' | 'study' | 'expense' | 'general'
  type: string
  href?: string
}

export default function CalendarPage() {
  const { user } = useUser()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const loadMonthEvents = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    const monthStartStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const monthEndStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

    const [wLogs, exLogs, sessions, txs, recurrings, checklists] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('user_id', user.id).gte('log_date', monthStartStr).lte('log_date', monthEndStr),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).gte('log_date', monthStartStr).lte('log_date', monthEndStr),
      supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('session_date', monthStartStr).lte('session_date', monthEndStr),
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('transaction_date', monthStartStr).lte('transaction_date', monthEndStr),
      supabase.from('recurring_transactions').select('*').eq('user_id', user.id).gte('next_due_date', monthStartStr).lte('next_due_date', monthEndStr),
      supabase.from('daily_checklists').select('*').eq('user_id', user.id).gte('checklist_date', monthStartStr).lte('checklist_date', monthEndStr),
    ])

    const evts: CalendarEvent[] = []

    // Weight logs
    ;(wLogs.data ?? []).forEach((w: any) => {
      evts.push({
        id: w.id,
        date: w.log_date,
        title: `⚖️ Cân nặng: ${w.weight} kg`,
        category: 'fitness',
        type: 'weight',
        href: '/fitness',
      })
    })

    // Exercise logs
    ;(exLogs.data ?? []).forEach((e: any) => {
      evts.push({
        id: e.id,
        date: e.log_date,
        title: `🏃 Tập: ${e.exercise_type} (${e.duration_minutes}p)`,
        category: 'fitness',
        type: 'exercise',
        href: '/fitness',
      })
    })

    // Study sessions
    ;(sessions.data ?? []).forEach((s: any) => {
      evts.push({
        id: s.id,
        date: s.session_date,
        title: `📖 Học tiếng Trung: ${s.new_words_count} từ mới, ${s.reviewed_words_count} ôn`,
        category: 'study',
        type: 'study',
        href: '/chinese',
      })
    })

    // Transactions
    ;(txs.data ?? []).forEach((t: any) => {
      evts.push({
        id: t.id,
        date: t.transaction_date,
        title: `${t.type === 'expense' ? '💸 Chi' : '💰 Thu'}: ${t.description || 'Giao dịch'} (${formatVNDCompact(t.amount)})`,
        category: 'expense',
        type: 'transaction',
        href: '/expenses',
      })
    })

    // Recurring due dates
    ;(recurrings.data ?? []).forEach((r: any) => {
      evts.push({
        id: r.id,
        date: r.next_due_date,
        title: `🔁 Hạn giao dịch định kỳ: ${r.description}`,
        category: 'expense',
        type: 'recurring',
        href: '/expenses/recurring',
      })
    })

    // Daily checklists
    ;(checklists.data ?? []).forEach((c: any) => {
      evts.push({
        id: c.id,
        date: c.checklist_date,
        title: `${c.is_completed ? '✅' : '☑️'} Checklist: ${c.item_text}`,
        category: c.category === 'other' ? 'general' : (c.category as any),
        type: 'checklist',
        href: '/dashboard',
      })
    })

    setEvents(evts)
    setLoading(false)
  }, [user, currentMonth])

  useEffect(() => {
    if (!user) return
    loadMonthEvents()
  }, [user, currentMonth, loadMonthEvents])

  useDataChanged('all', loadMonthEvents)

  // Grid dates calculations
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const filteredEvents = events.filter(e => {
    if (selectedCategory === 'all') return true
    return e.category === selectedCategory
  })

  const selectedDayStr = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayEvents = filteredEvents.filter(e => e.date === selectedDayStr)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Lịch tổng hợp</h1>
          <p className="page-subtitle">Theo dõi toàn bộ hoạt động sức khỏe, học tập & tài chính theo ngày</p>
        </div>
        <div className="header-actions">
          <button className="mochi-btn mochi-btn-secondary mochi-btn-sm" onClick={() => setSelectedDate(new Date())}>
            Hôm nay
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="category-filters">
        <button
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Tất cả
        </button>
        {Object.entries(MODULE_CATEGORY_LABELS).map(([key, info]) => (
          <button
            key={key}
            className={`filter-btn ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key)}
          >
            {info.emoji} {info.label}
          </button>
        ))}
      </div>

      {/* Month Navigator Header */}
      <div className="calendar-header-bar mochi-card">
        <button className="mochi-btn mochi-btn-ghost mochi-btn-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          ← Tháng trước
        </button>
        <h2 className="month-title">
          {format(currentMonth, 'MMMM yyyy', { locale: vi }).toUpperCase()}
        </h2>
        <button className="mochi-btn mochi-btn-ghost mochi-btn-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          Tháng sau →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-card mochi-card">
        <div className="weekdays-header">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
            <div key={i} className="weekday-col">{d}</div>
          ))}
        </div>

        <div className="days-grid">
          {calendarDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayEvents = filteredEvents.filter(e => e.date === dayStr)
            const isSelected = isSameDay(day, selectedDate)
            const isCurrentMonth = isSameMonth(day, currentMonth)

            return (
              <div
                key={idx}
                className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected-day' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="day-number">{format(day, 'd')}</div>
                <div className="day-dots">
                  {dayEvents.slice(0, 3).map(e => (
                    <span
                      key={e.id}
                      className="event-dot"
                      style={{
                        background:
                          e.category === 'fitness'
                            ? 'var(--peach-400)'
                            : e.category === 'study'
                              ? 'var(--lavender-400)'
                              : e.category === 'expense'
                                ? 'var(--mint-400)'
                                : 'var(--cheese-400)',
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && <span className="more-count">+{dayEvents.length - 3}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      <div className="day-details-card mochi-card">
        <h3 className="day-details-title">
          📌 Chi tiết ngày {format(selectedDate, 'dd/MM/yyyy')} ({selectedDayEvents.length} sự kiện)
        </h3>

        {selectedDayEvents.length === 0 ? (
          <div className="mochi-empty-state" style={{ padding: 20 }}>
            <p>Chưa có ghi chép nào trong ngày này</p>
          </div>
        ) : (
          <div className="events-list">
            {selectedDayEvents.map(evt => (
              <div key={evt.id} className="event-item-card">
                <div className="evt-info">
                  <span className="evt-title">{evt.title}</span>
                </div>
                {evt.href && (
                  <Link href={evt.href} className="mochi-btn mochi-btn-secondary mochi-btn-sm">
                    Xem chi tiết →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .page { max-width: 900px; margin: 0 auto; padding-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .page-subtitle { font-size: 0.875rem; color: var(--chocolate-400); font-weight: 600; margin: 4px 0 0; }
        .category-filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .filter-btn { padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--chocolate-100); background: white; font-weight: 700; font-size: 0.8rem; color: var(--chocolate-500); cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .filter-btn.active { background: var(--cheese-100); border-color: var(--cheese-300); color: var(--chocolate-700); }
        .calendar-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; }
        .month-title { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
        .calendar-grid-card { padding: 16px; }
        .weekdays-header { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 800; font-size: 0.85rem; color: var(--chocolate-400); margin-bottom: 8px; }
        .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .day-cell { aspect-ratio: 1; border-radius: 14px; padding: 6px; border: 1px solid var(--chocolate-100); cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; justify-content: space-between; }
        .day-cell:hover { background: var(--cream); transform: scale(1.03); }
        .day-cell.other-month { opacity: 0.3; }
        .day-cell.selected-day { border-color: var(--cheese-400); background: var(--cheese-50); box-shadow: var(--shadow-sm); }
        .day-number { font-weight: 800; font-size: 0.85rem; color: var(--chocolate-600); }
        .day-dots { display: flex; gap: 3px; align-items: center; flex-wrap: wrap; }
        .event-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .more-count { font-size: 0.6rem; font-weight: 800; color: var(--chocolate-400); }
        .day-details-card { padding: 20px; }
        .day-details-title { font-size: 1rem; font-weight: 800; color: var(--chocolate-600); margin: 0 0 12px; }
        .events-list { display: flex; flex-direction: column; gap: 8px; }
        .event-item-card { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--cream); border-radius: 14px; border: 1px solid var(--chocolate-100); }
        .evt-title { font-weight: 700; font-size: 0.85rem; color: var(--chocolate-600); }
      `}</style>
    </div>
  )
}
