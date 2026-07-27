'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { calculateNextReview, getInitialSRState, formatInterval } from '@/lib/spaced-repetition'
import { MEMORY_LEVEL_LABELS } from '@/lib/format'
import type { HskVocabulary, ReviewRating } from '@/lib/types'

export default function FlashcardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [cards, setCards] = useState<HskVocabulary[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionDone, setSessionDone] = useState(false)
  const [stats, setStats] = useState({ forgot: 0, hard: 0, remembered: 0, easy: 0 })
  const [mode, setMode] = useState<'due' | 'all' | 'hard'>('due')
  const [started, setStarted] = useState(false)

  useEffect(() => { if (user) loadCards() }, [user, mode])

  async function loadCards() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from('hsk_vocabulary').select('*').eq('user_id', user.id)
    if (mode === 'due') query = query.lte('next_review_at', new Date().toISOString())
    else if (mode === 'hard') query = query.in('memory_level', ['not_learned', 'hard'])
    const { data } = await query.order('next_review_at')
    // Shuffle
    const shuffled = (data ?? []).sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setIndex(0)
    setFlipped(false)
    setSessionDone(false)
    setStats({ forgot: 0, hard: 0, remembered: 0, easy: 0 })
    setLoading(false)
  }

  async function handleRating(rating: ReviewRating) {
    const card = cards[index]
    if (!card || !user) return

    const isCorrect = rating === 'remembered' || rating === 'easy'
    const currentState = {
      interval_days: card.sr_interval_days,
      ease_factor: card.sr_ease_factor,
      repetitions: card.sr_repetitions,
      next_review_at: new Date(card.next_review_at),
    }
    const nextState = calculateNextReview(currentState, rating)

    const supabase = createClient()
    await Promise.all([
      supabase.from('hsk_vocabulary').update({
        sr_interval_days: nextState.interval_days,
        sr_ease_factor: nextState.ease_factor,
        sr_repetitions: nextState.repetitions,
        next_review_at: nextState.next_review_at.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        correct_count: isCorrect ? card.correct_count + 1 : card.correct_count,
        incorrect_count: !isCorrect ? card.incorrect_count + 1 : card.incorrect_count,
        memory_level: getMemoryLevel(nextState.repetitions),
      }).eq('id', card.id),
      supabase.from('vocabulary_reviews').insert({
        user_id: user.id,
        vocabulary_id: card.id,
        rating,
        is_correct: isCorrect,
      }),
    ])

    setStats(s => ({ ...s, [rating]: s[rating as keyof typeof s] + 1 }))

    const nextIndex = index + 1
    if (nextIndex >= cards.length) {
      setSessionDone(true)
    } else {
      setIndex(nextIndex)
      setFlipped(false)
    }
  }

  function getMemoryLevel(repetitions: number): string {
    if (repetitions === 0) return 'not_learned'
    if (repetitions === 1) return 'hard'
    if (repetitions <= 3) return 'learning'
    if (repetitions <= 6) return 'learned'
    return 'mastered'
  }

  const currentCard = cards[index]
  const progress = cards.length > 0 ? Math.round(((index) / cards.length) * 100) : 0

  if (loading) {
    return (
      <div className="fc-loading">
        <span className="animate-float" style={{ fontSize: '3rem' }}>🃏</span>
        <p>Đang tải flashcard...</p>
        <style jsx>{`.fc-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; color: var(--chocolate-400); font-weight: 600; }`}</style>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="fc-start">
        <div className="fc-start-card">
          <span style={{ fontSize: '3rem' }}>🃏</span>
          <h1>Flashcard ôn tập</h1>
          <div className="mode-select">
            {([ ['due', `🔴 Cần ôn hôm nay`, cards.length > 0 ? `${cards.length} từ` : 'Đang tải...'], ['all', '📚 Tất cả từ vựng', ''], ['hard', '💪 Từ khó nhớ', ''] ] as [string, string, string][]).map(([m, label, sub]) => (
              <button key={m} className={`mode-btn ${mode === m ? 'selected' : ''}`} onClick={() => setMode(m as any)}>
                <span>{label}</span>
                {sub && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{sub}</span>}
              </button>
            ))}
          </div>
          {cards.length === 0 && mode === 'due' ? (
            <div className="fc-empty">
              <span>🎉</span>
              <p>Không có từ nào cần ôn hôm nay!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--chocolate-400)' }}>Bạn đã ôn tập đầy đủ rồi.</p>
            </div>
          ) : (
            <button className="mochi-btn mochi-btn-primary mochi-btn-lg" onClick={() => setStarted(true)} disabled={cards.length === 0}>
              🚀 Bắt đầu ({cards.length} từ)
            </button>
          )}
          <button className="mochi-btn mochi-btn-ghost" onClick={() => router.back()}>← Quay lại</button>
        </div>
        <style jsx>{fcStyles}</style>
      </div>
    )
  }

  if (sessionDone) {
    const total = stats.forgot + stats.hard + stats.remembered + stats.easy
    const correct = stats.remembered + stats.easy
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="fc-done">
        <div className="fc-done-card animate-bounce-in">
          <span className="done-emoji">{accuracy >= 80 ? '🎉' : accuracy >= 50 ? '😊' : '💪'}</span>
          <h2>Xong phiên ôn tập!</h2>
          <div className="done-stats">
            <div className="done-stat"><span className="ds-value">{accuracy}%</span><span className="ds-label">Tỷ lệ đúng</span></div>
            <div className="done-stat"><span className="ds-value">{total}</span><span className="ds-label">Tổng từ</span></div>
            <div className="done-stat"><span className="ds-value">{correct}</span><span className="ds-label">Đúng</span></div>
            <div className="done-stat"><span className="ds-value">{stats.forgot}</span><span className="ds-label">Quên</span></div>
          </div>
          <div className="done-breakdown">
            {([ ['forgot', '😰 Quên', '#FF7A5C'], ['hard', '😅 Khó', '#FFCA1A'], ['remembered', '😊 Nhớ', '#3BB88E'], ['easy', '😄 Dễ', '#8F71F5'] ] as [string, string, string][]).map(([key, label, color]) => (
              <div key={key} className="breakdown-item">
                <span style={{ color }}>{label}</span>
                <span>{stats[key as keyof typeof stats]}</span>
              </div>
            ))}
          </div>
          <div className="done-actions">
            <button className="mochi-btn mochi-btn-secondary" onClick={() => router.back()}>Về trang từ vựng</button>
            <button className="mochi-btn mochi-btn-primary" onClick={() => { setStarted(false); loadCards() }}>Ôn tiếp</button>
          </div>
        </div>
        <style jsx>{fcStyles}</style>
      </div>
    )
  }

  return (
    <div className="fc-session">
      {/* Progress */}
      <div className="fc-progress">
        <div className="fc-progress-info">
          <span>{index + 1} / {cards.length}</span>
          <button onClick={() => router.back()} className="fc-exit">✕ Kết thúc</button>
        </div>
        <div className="mochi-progress">
          <div className="mochi-progress-bar study" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="fc-card-wrap flashcard-flip" onClick={() => setFlipped(!flipped)}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flashcard-front fc-card">
            <div className="fc-hint">Nhấn để xem nghĩa</div>
            <div className="fc-hanzi">{currentCard?.hanzi}</div>
            <div className="fc-pinyin">{currentCard?.pinyin}</div>
            {currentCard?.word_type && <div className="fc-type">{WORD_TYPE_LABELS[currentCard.word_type] ?? currentCard.word_type}</div>}
          </div>
          {/* Back */}
          <div className="flashcard-back fc-card fc-card-back">
            <div className="fc-hanzi fc-hanzi-small">{currentCard?.hanzi}</div>
            <div className="fc-pinyin-small">{currentCard?.pinyin}</div>
            <div className="fc-meaning">{currentCard?.meaning}</div>
            {currentCard?.example_cn && (
              <div className="fc-example">
                <div className="fc-example-cn">{currentCard.example_cn}</div>
                {currentCard.example_pinyin && <div className="fc-example-py">{currentCard.example_pinyin}</div>}
                {currentCard.example_vi && <div className="fc-example-vi">{currentCard.example_vi}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons (only when flipped) */}
      {flipped && (
        <div className="fc-ratings animate-slide-up">
          <p className="rating-prompt">Bạn nhớ từ này như thế nào?</p>
          <div className="rating-btns">
            <button className="rating-btn rating-forgot" onClick={() => handleRating('forgot')}>😰<br/>Quên</button>
            <button className="rating-btn rating-hard" onClick={() => handleRating('hard')}>😅<br/>Khó</button>
            <button className="rating-btn rating-remembered" onClick={() => handleRating('remembered')}>😊<br/>Nhớ</button>
            <button className="rating-btn rating-easy" onClick={() => handleRating('easy')}>😄<br/>Dễ</button>
          </div>
        </div>
      )}

      {!flipped && (
        <div style={{ textAlign: 'center', color: 'var(--chocolate-300)', fontSize: '0.85rem', fontWeight: 600, marginTop: 12 }}>
          👆 Nhấn vào thẻ để lật
        </div>
      )}

      <style jsx>{fcStyles}</style>
    </div>
  )
}

const fcStyles = `
  .fc-loading, .fc-start, .fc-done, .fc-session {
    max-width: 560px;
    margin: 0 auto;
    padding: 16px;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .fc-start-card {
    background: white;
    border-radius: 28px;
    padding: 36px;
    box-shadow: var(--shadow-lg);
    border: 1.5px solid var(--chocolate-100);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    text-align: center;
  }

  .fc-start-card h1 { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }

  .mode-select { display: flex; flex-direction: column; gap: 8px; width: 100%; }
  .mode-btn { width: 100%; padding: 12px 16px; border-radius: 16px; border: 1.5px solid var(--chocolate-200); background: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; display: flex; justify-content: space-between; }
  .mode-btn.selected { background: var(--lavender-50); border-color: var(--lavender-400); color: var(--lavender-500); }
  .fc-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 1.5rem; }
  .fc-empty p { margin: 0; font-weight: 700; color: var(--chocolate-600); font-size: 1rem; }

  .fc-session { width: 100%; justify-content: flex-start; padding-top: 20px; }
  .fc-progress { width: 100%; margin-bottom: 20px; }
  .fc-progress-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 700; font-size: 0.85rem; color: var(--chocolate-500); }
  .fc-exit { background: none; border: none; cursor: pointer; color: var(--chocolate-400); font-weight: 700; font-size: 0.85rem; font-family: 'Nunito', sans-serif; }

  .fc-card-wrap { width: 100%; height: 320px; cursor: pointer; }
  .fc-card { width: 100%; height: 100%; background: white; box-shadow: var(--shadow-lg); border: 1.5px solid var(--chocolate-100); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 28px; }
  .fc-card-back { background: linear-gradient(135deg, #F5F2FF, #E8E0FF); border-color: var(--lavender-200); overflow-y: auto; }
  .fc-hint { font-size: 0.78rem; color: var(--chocolate-300); font-weight: 600; position: absolute; top: 16px; }
  .fc-card { position: relative; }
  .fc-hanzi { font-size: 3.5rem; font-weight: 800; color: var(--chocolate-700); line-height: 1; }
  .fc-hanzi-small { font-size: 2rem; }
  .fc-pinyin { font-size: 1.1rem; color: var(--lavender-400); font-weight: 700; font-style: italic; }
  .fc-pinyin-small { font-size: 0.9rem; color: var(--lavender-400); font-weight: 600; }
  .fc-type { font-size: 0.75rem; background: var(--cheese-100); color: var(--chocolate-500); padding: 3px 10px; border-radius: 999px; font-weight: 700; }
  .fc-meaning { font-size: 1.3rem; font-weight: 800; color: var(--chocolate-700); text-align: center; }
  .fc-example { width: 100%; background: rgba(255,255,255,0.6); border-radius: 12px; padding: 12px; text-align: center; display: flex; flex-direction: column; gap: 4px; }
  .fc-example-cn { font-size: 1rem; color: var(--chocolate-700); font-weight: 700; }
  .fc-example-py { font-size: 0.8rem; color: var(--lavender-400); font-style: italic; }
  .fc-example-vi { font-size: 0.82rem; color: var(--chocolate-500); font-weight: 600; }

  .fc-ratings { width: 100%; margin-top: 16px; text-align: center; }
  .rating-prompt { font-size: 0.9rem; font-weight: 700; color: var(--chocolate-500); margin: 0 0 12px; }
  .rating-btns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .rating-btn { padding: 12px 8px; border-radius: 18px; border: 2px solid transparent; background: white; font-weight: 800; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: 'Nunito', sans-serif; box-shadow: var(--shadow-sm); }
  .rating-forgot { border-color: #FF7A5C; color: #FF7A5C; }
  .rating-forgot:hover { background: #FFF4F0; transform: scale(1.05); }
  .rating-hard { border-color: #FFCA1A; color: #E6B200; }
  .rating-hard:hover { background: #FFF9E6; transform: scale(1.05); }
  .rating-remembered { border-color: #3BB88E; color: #3BB88E; }
  .rating-remembered:hover { background: #EDFAF5; transform: scale(1.05); }
  .rating-easy { border-color: #8F71F5; color: #8F71F5; }
  .rating-easy:hover { background: #F5F2FF; transform: scale(1.05); }

  .fc-done { width: 100%; }
  .fc-done-card { background: white; border-radius: 28px; padding: 32px; box-shadow: var(--shadow-lg); border: 1.5px solid var(--chocolate-100); width: 100%; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
  .done-emoji { font-size: 3.5rem; }
  .fc-done-card h2 { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
  .done-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; }
  .done-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .ds-value { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); }
  .ds-label { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); }
  .done-breakdown { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
  .breakdown-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font-weight: 800; font-size: 0.85rem; }
  .done-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
`

const WORD_TYPE_LABELS: Record<string, string> = {
  noun: 'Danh từ', verb: 'Động từ', adjective: 'Tính từ', adverb: 'Phó từ',
  preposition: 'Giới từ', conjunction: 'Liên từ', pronoun: 'Đại từ',
  measure_word: 'Lượng từ', particle: 'Trợ từ', interjection: 'Thán từ', other: 'Khác',
}
