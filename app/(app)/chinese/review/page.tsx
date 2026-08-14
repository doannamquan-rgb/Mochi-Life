'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { calculateNextReview } from '@/lib/spaced-repetition'
import { MEMORY_LEVEL_LABELS } from '@/lib/format'
import { notifyDataChanged } from '@/lib/events'
import { useMochiReaction } from '@/hooks/use-mochi-reaction'
import type { HskVocabulary, ReviewRating } from '@/lib/types'
import { formatDate } from '@/lib/date-utils'

const WORD_TYPE_LABELS: Record<string, string> = {
  noun: 'Danh từ', verb: 'Động từ', adjective: 'Tính từ', adverb: 'Phó từ',
  preposition: 'Giới từ', conjunction: 'Liên từ', pronoun: 'Đại từ',
  measure_word: 'Lượng từ', particle: 'Trợ từ', interjection: 'Thán từ', other: 'Khác',
}

export default function ReviewPage() {
  const { user } = useUser()
  const { triggerReaction } = useMochiReaction()
  const [dueCards, setDueCards] = useState<HskVocabulary[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ forgot: 0, hard: 0, remembered: 0, easy: 0 })
  const [sessionStart] = useState(Date.now())

  useEffect(() => { if (user) loadDueCards() }, [user])

  async function loadDueCards() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('hsk_vocabulary')
      .select('*')
      .eq('user_id', user.id)
      .neq('memory_level', 'not_learned')
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at')
    const shuffled = (data ?? []).sort(() => Math.random() - 0.5)
    setDueCards(shuffled)
    setIndex(0)
    setFlipped(false)
    setDone(false)
    setStats({ forgot: 0, hard: 0, remembered: 0, easy: 0 })
    setLoading(false)
  }

  async function handleRating(rating: ReviewRating) {
    const card = dueCards[index]
    if (!card || !user) return

    const isCorrect = rating === 'remembered' || rating === 'easy'
    const nextState = calculateNextReview(
      { interval_days: card.sr_interval_days, ease_factor: card.sr_ease_factor, repetitions: card.sr_repetitions, next_review_at: new Date(card.next_review_at) },
      rating
    )

    const memoryLevel = (() => {
      const r = nextState.repetitions
      if (r === 0) return 'not_learned'
      if (r === 1) return 'hard'
      if (r <= 3) return 'learning'
      if (r <= 6) return 'learned'
      return 'mastered'
    })()

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
        memory_level: memoryLevel,
      }).eq('id', card.id),
      supabase.from('vocabulary_reviews').insert({
        user_id: user.id,
        vocabulary_id: card.id,
        rating,
        is_correct: isCorrect,
      }),
    ])

    notifyDataChanged('chinese', 'review')

    setStats(s => ({ ...s, [rating]: s[rating as keyof typeof s] + 1 }))

    if (index + 1 >= dueCards.length) {
      // Save session
      const durationMinutes = Math.round((Date.now() - sessionStart) / 60000)
      await supabase.from('study_sessions').upsert({
        user_id: user.id,
        session_date: new Date().toISOString().split('T')[0],
        reviewed_words_count: dueCards.length,
        new_words_count: 0,
        duration_minutes: Math.max(1, durationMinutes),
        is_auto_generated: true,
      }, { onConflict: 'user_id,session_date' })
      // Fire Smart Reaction for completed review session
      const todayDate = new Date().toISOString().split('T')[0]
      const { awardXP } = await import('@/lib/gamification')
      awardXP(user.id, 25, 'review_completed', `review:${todayDate}`)
      triggerReaction('review_session_completed', { dedupKey: todayDate, delayMs: 600 })
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setFlipped(false)
    }
  }

  const current = dueCards[index]
  const progress = dueCards.length > 0 ? Math.round((index / dueCards.length) * 100) : 0
  const total = stats.forgot + stats.hard + stats.remembered + stats.easy
  const correct = stats.remembered + stats.easy
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <span className="animate-float" style={{ fontSize: '3rem' }}>🔄</span>
      <p style={{ color: 'var(--chocolate-400)', fontWeight: 600 }}>Đang tải từ cần ôn...</p>
    </div>
  )

  if (dueCards.length === 0) return (
    <div className="review-page">
      <div className="review-empty">
        <span className="animate-float" style={{ fontSize: '4rem' }}>🎉</span>
        <h2>Không còn từ nào cần ôn!</h2>
        <p>Tuyệt vời! Bạn đã ôn tập đầy đủ rồi. Hãy quay lại sau nhé!</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/chinese/vocabulary" className="mochi-btn mochi-btn-secondary">📚 Từ vựng</Link>
          <Link href="/chinese" className="mochi-btn mochi-btn-primary">🏠 Trang học</Link>
        </div>
      </div>
      <style jsx>{reviewStyles}</style>
    </div>
  )

  if (done) {
    return (
      <div className="review-page">
        <div className="done-card animate-bounce-in">
          <span style={{ fontSize: '3.5rem' }}>{accuracy >= 80 ? '🎉' : accuracy >= 50 ? '😊' : '💪'}</span>
          <h2>Xong phiên ôn tập!</h2>
          <div className="done-stats">
            <div className="done-stat"><div className="ds-val">{dueCards.length}</div><div className="ds-lbl">Tổng từ</div></div>
            <div className="done-stat"><div className="ds-val">{accuracy}%</div><div className="ds-lbl">Tỷ lệ đúng</div></div>
            <div className="done-stat"><div className="ds-val green">{correct}</div><div className="ds-lbl">Nhớ được</div></div>
            <div className="done-stat"><div className="ds-val red">{stats.forgot}</div><div className="ds-lbl">Quên</div></div>
          </div>
          <div className="rating-breakdown">
            <div className="rb-item"><span style={{color:'#FF7A5C'}}>😰 Quên: {stats.forgot}</span></div>
            <div className="rb-item"><span style={{color:'#FFCA1A'}}>😅 Khó: {stats.hard}</span></div>
            <div className="rb-item"><span style={{color:'#3BB88E'}}>😊 Nhớ: {stats.remembered}</span></div>
            <div className="rb-item"><span style={{color:'#8F71F5'}}>😄 Dễ: {stats.easy}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="mochi-btn mochi-btn-secondary" onClick={loadDueCards}>Ôn tiếp</button>
            <Link href="/chinese" className="mochi-btn mochi-btn-primary">🏠 Về trang học</Link>
          </div>
        </div>
        <style jsx>{reviewStyles}</style>
      </div>
    )
  }

  return (
    <div className="review-page">
      {/* Progress */}
      <div className="review-header">
        <Link href="/chinese" className="back-btn">← Quay lại</Link>
        <div className="review-progress">
          <div className="progress-text">{index + 1}/{dueCards.length}</div>
          <div className="mochi-progress">
            <div className="mochi-progress-bar study" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="review-accuracy">{total > 0 ? `${accuracy}%` : '–'}</div>
      </div>

      {/* Card */}
      <div className="review-card-wrap flashcard-flip" onClick={() => setFlipped(!flipped)}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          <div className="flashcard-front review-card">
            <div className="rc-hint">Nhấn để xem nghĩa</div>
            <div className="rc-hanzi">{current?.hanzi}</div>
            <div className="rc-pinyin">{current?.pinyin}</div>
            {current?.word_type && <div className="rc-type">{WORD_TYPE_LABELS[current.word_type] ?? current.word_type}</div>}
            {/* Memory badge */}
            <div className={`rc-memory memory-${current?.memory_level}`}>
              {MEMORY_LEVEL_LABELS[current?.memory_level ?? 'not_learned']?.label}
            </div>
          </div>
          <div className="flashcard-back review-card review-card-back">
            <div className="rc-hanzi-sm">{current?.hanzi}</div>
            <div className="rc-pinyin-sm">{current?.pinyin}</div>
            <div className="rc-meaning">{current?.meaning}</div>
            {current?.example_cn && (
              <div className="rc-example">
                <div className="rc-ex-cn">{current.example_cn}</div>
                {current.example_pinyin && <div className="rc-ex-py">{current.example_pinyin}</div>}
                {current.example_vi && <div className="rc-ex-vi">{current.example_vi}</div>}
              </div>
            )}
            {current?.note && <div className="rc-note">📝 {current.note}</div>}
          </div>
        </div>
      </div>

      {/* Rating */}
      {flipped && (
        <div className="review-ratings animate-slide-up">
          <p className="rating-q">Bạn nhớ từ này như thế nào?</p>
          <div className="rating-row">
            <button className="rate-btn rate-forgot" onClick={() => handleRating('forgot')}>😰<br/>Quên</button>
            <button className="rate-btn rate-hard" onClick={() => handleRating('hard')}>😅<br/>Khó</button>
            <button className="rate-btn rate-ok" onClick={() => handleRating('remembered')}>😊<br/>Nhớ</button>
            <button className="rate-btn rate-easy" onClick={() => handleRating('easy')}>😄<br/>Dễ</button>
          </div>
        </div>
      )}

      {!flipped && (
        <div style={{ textAlign: 'center', color: 'var(--chocolate-300)', fontWeight: 600, marginTop: 12, fontSize: '0.875rem' }}>
          👆 Nhấn vào thẻ để lật
        </div>
      )}

      <style jsx>{reviewStyles}</style>
    </div>
  )
}

const reviewStyles = `
  .review-page {
    max-width: 560px;
    margin: 0 auto;
    padding: 20px 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 80vh;
  }

  .review-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    margin-top: 60px;
  }

  .review-empty h2 { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
  .review-empty p { color: var(--chocolate-400); font-weight: 600; max-width: 320px; line-height: 1.6; }

  .review-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .back-btn {
    color: var(--chocolate-400);
    font-weight: 700;
    font-size: 0.875rem;
    text-decoration: none;
    white-space: nowrap;
  }

  .review-progress {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progress-text { font-size: 0.8rem; font-weight: 700; color: var(--chocolate-500); text-align: center; }
  .review-accuracy { font-size: 0.9rem; font-weight: 800; color: var(--lavender-400); white-space: nowrap; }

  .review-card-wrap {
    width: 100%;
    height: 300px;
    cursor: pointer;
  }

  .review-card {
    width: 100%;
    height: 100%;
    background: white;
    box-shadow: var(--shadow-lg);
    border: 1.5px solid var(--chocolate-100);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    border-radius: 24px;
    position: relative;
  }

  .review-card-back {
    background: linear-gradient(135deg, #F5F2FF, #E8E0FF);
    border-color: var(--lavender-200);
    overflow-y: auto;
    justify-content: flex-start;
    padding-top: 24px;
  }

  .rc-hint { position: absolute; top: 14px; font-size: 0.72rem; color: var(--chocolate-300); font-weight: 600; }
  .rc-hanzi { font-size: 3.5rem; font-weight: 800; color: var(--chocolate-700); line-height: 1; }
  .rc-pinyin { font-size: 1rem; color: var(--lavender-400); font-weight: 700; font-style: italic; }
  .rc-type { font-size: 0.72rem; background: var(--cheese-100); color: var(--chocolate-500); padding: 3px 10px; border-radius: 999px; font-weight: 700; }
  .rc-memory { font-size: 0.72rem; padding: 3px 10px; border-radius: 999px; font-weight: 700; }
  .rc-memory.memory-not_learned { background: #D9C4A820; color: #B8997A; }
  .rc-memory.memory-hard { background: #FF7A5C20; color: #FF7A5C; }
  .rc-memory.memory-learning { background: #FFCA1A20; color: #E6B200; }
  .rc-memory.memory-learned { background: #3BB88E20; color: #3BB88E; }
  .rc-memory.memory-mastered { background: #8F71F520; color: #8F71F5; }

  .rc-hanzi-sm { font-size: 2rem; font-weight: 800; color: var(--chocolate-700); }
  .rc-pinyin-sm { font-size: 0.85rem; color: var(--lavender-400); font-weight: 600; font-style: italic; }
  .rc-meaning { font-size: 1.3rem; font-weight: 800; color: var(--chocolate-700); text-align: center; }
  .rc-example {
    width: 100%;
    background: rgba(255,255,255,0.7);
    border-radius: 14px;
    padding: 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rc-ex-cn { font-size: 1rem; font-weight: 700; color: var(--chocolate-700); }
  .rc-ex-py { font-size: 0.8rem; color: var(--lavender-400); font-style: italic; }
  .rc-ex-vi { font-size: 0.82rem; color: var(--chocolate-500); font-weight: 600; }
  .rc-note { font-size: 0.8rem; color: var(--chocolate-400); font-weight: 600; text-align: center; }

  .review-ratings { text-align: center; }
  .rating-q { font-size: 0.9rem; font-weight: 700; color: var(--chocolate-500); margin: 0 0 12px; }
  .rating-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .rate-btn {
    padding: 12px 6px;
    border-radius: 18px;
    border: 2px solid;
    background: white;
    font-weight: 800;
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Nunito', sans-serif;
    box-shadow: var(--shadow-sm);
    line-height: 1.4;
  }
  .rate-forgot { border-color: #FF7A5C; color: #FF7A5C; }
  .rate-forgot:hover { background: #FFF4F0; transform: scale(1.05); }
  .rate-hard { border-color: #FFCA1A; color: #E6B200; }
  .rate-hard:hover { background: #FFF9E6; transform: scale(1.05); }
  .rate-ok { border-color: #3BB88E; color: #3BB88E; }
  .rate-ok:hover { background: #EDFAF5; transform: scale(1.05); }
  .rate-easy { border-color: #8F71F5; color: #8F71F5; }
  .rate-easy:hover { background: #F5F2FF; transform: scale(1.05); }

  .done-card {
    background: white;
    border-radius: 28px;
    padding: 32px;
    box-shadow: var(--shadow-lg);
    border: 1.5px solid var(--chocolate-100);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    text-align: center;
    margin-top: 40px;
  }
  .done-card h2 { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
  .done-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; }
  .done-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .ds-val { font-size: 1.4rem; font-weight: 800; color: var(--chocolate-600); }
  .ds-val.green { color: var(--mint-400); }
  .ds-val.red { color: var(--peach-400); }
  .ds-lbl { font-size: 0.72rem; font-weight: 700; color: var(--chocolate-400); }
  .rating-breakdown { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
  .rb-item { font-weight: 700; font-size: 0.875rem; }
`
