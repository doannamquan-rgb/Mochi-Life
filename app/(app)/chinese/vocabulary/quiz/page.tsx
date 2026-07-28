'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { HskVocabulary } from '@/lib/types'

type QuizQuestion = {
  vocab: HskVocabulary
  options: string[]
  correctIndex: number
}

function generateQuiz(vocab: HskVocabulary[]): QuizQuestion[] {
  const shuffled = [...vocab].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(20, shuffled.length)).map(v => {
    const wrongOptions = vocab
      .filter(x => x.id !== v.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(x => x.meaning)
    const correctIndex = Math.floor(Math.random() * 4)
    const options = [...wrongOptions]
    options.splice(correctIndex, 0, v.meaning)
    return { vocab: v, options, correctIndex }
  })
}

export default function QuizPage() {
  const router = useRouter()
  const { user } = useUser()
  const [vocab, setVocab] = useState<HskVocabulary[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [wrongList, setWrongList] = useState<{ hanzi: string; meaning: string; selected: string }[]>([])

  useEffect(() => { if (user) loadVocab() }, [user])

  async function loadVocab() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('hsk_vocabulary')
      .select('*')
      .eq('user_id', user.id)
    setVocab(data ?? [])
    setLoading(false)
  }

  function startQuiz() {
    const qs = generateQuiz(vocab)
    setQuestions(qs)
    setIndex(0)
    setSelected(null)
    setScore(0)
    setDone(false)
    setWrongList([])
    setStarted(true)
  }

  function handleSelect(i: number) {
    if (selected !== null) return // already answered
    setSelected(i)
    const q = questions[index]
    if (i === q.correctIndex) {
      setScore(s => s + 1)
    } else {
      setWrongList(w => [...w, { hanzi: q.vocab.hanzi, meaning: q.vocab.meaning, selected: q.options[i] }])
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setSelected(null)
    }
  }

  const q = questions[index]
  const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <span className="animate-float" style={{ fontSize: '3rem' }}>❓</span>
      <p style={{ color: 'var(--chocolate-400)', fontWeight: 600 }}>Đang tải câu hỏi...</p>
    </div>
  )

  if (!started) return (
    <div className="quiz-start">
      <div className="start-card animate-bounce-in">
        <span style={{ fontSize: '3.5rem' }}>❓</span>
        <h1>Quiz Từ vựng</h1>
        <p>Kiểm tra kiến thức từ vựng tiếng Trung của bạn!</p>
        {vocab.length < 4 ? (
          <div className="not-enough">
            <p>Cần ít nhất 4 từ vựng để làm quiz.</p>
            <Link href="/chinese/vocabulary?action=add" className="mochi-btn mochi-btn-primary">+ Thêm từ vựng</Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--chocolate-400)', fontWeight: 600 }}>
              {Math.min(20, vocab.length)} câu hỏi · Trắc nghiệm 4 lựa chọn
            </p>
            <button className="mochi-btn mochi-btn-primary mochi-btn-lg" onClick={startQuiz}>🚀 Bắt đầu Quiz</button>
          </>
        )}
        <Link href="/chinese/vocabulary" className="mochi-btn mochi-btn-ghost">← Quay lại</Link>
      </div>
      <style jsx>{quizStyles}</style>
    </div>
  )

  if (done) return (
    <div className="quiz-start">
      <div className="start-card animate-bounce-in">
        <span style={{ fontSize: '3.5rem' }}>{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '😊' : '💪'}</span>
        <h1>Kết quả Quiz</h1>
        <div className="result-score">{score}/{questions.length}</div>
        <div className="result-acc" style={{ color: accuracy >= 80 ? '#3BB88E' : accuracy >= 60 ? '#FFCA1A' : '#FF7A5C' }}>{accuracy}% chính xác</div>
        {wrongList.length > 0 && (
          <div className="wrong-list">
            <h3>Từ cần ôn lại:</h3>
            {wrongList.map((w, i) => (
              <div key={i} className="wrong-item">
                <span className="wrong-hanzi">{w.hanzi}</span>
                <span className="wrong-meaning">→ {w.meaning}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="mochi-btn mochi-btn-secondary" onClick={startQuiz}>🔄 Làm lại</button>
          <Link href="/chinese" className="mochi-btn mochi-btn-primary">🏠 Về trang học</Link>
        </div>
      </div>
      <style jsx>{quizStyles}</style>
    </div>
  )

  return (
    <div className="quiz-session">
      <div className="quiz-header">
        <Link href="/chinese/vocabulary" className="back-btn">← Thoát</Link>
        <div className="quiz-progress">
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--chocolate-500)', textAlign: 'center', marginBottom: 4 }}>{index + 1}/{questions.length}</div>
          <div className="mochi-progress">
            <div className="mochi-progress-bar study" style={{ width: `${((index) / questions.length) * 100}%` }} />
          </div>
        </div>
        <div style={{ font: '700 0.9rem Nunito', color: 'var(--mint-400)', whiteSpace: 'nowrap' }}>✓ {score}</div>
      </div>

      <div className="quiz-card">
        <div className="qc-label">Nghĩa của từ này là gì?</div>
        <div className="qc-hanzi">{q?.vocab.hanzi}</div>
        <div className="qc-pinyin">{q?.vocab.pinyin}</div>
        {q?.vocab.word_type && <div className="qc-type">{q.vocab.word_type}</div>}
      </div>

      <div className="options-grid">
        {q?.options.map((opt, i) => {
          let cls = 'option-btn'
          if (selected !== null) {
            if (i === q.correctIndex) cls += ' correct'
            else if (i === selected && i !== q.correctIndex) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null}>
              <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
              {opt}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className="quiz-feedback animate-slide-up">
          <div className={`feedback-msg ${selected === q?.correctIndex ? 'correct' : 'wrong'}`}>
            {selected === q?.correctIndex ? '✅ Chính xác!' : `❌ Sai rồi! Đáp án đúng: ${q?.vocab.meaning}`}
          </div>
          <button className="mochi-btn mochi-btn-primary" onClick={next}>
            {index + 1 >= questions.length ? '🏁 Xem kết quả' : 'Tiếp theo →'}
          </button>
        </div>
      )}

      <style jsx>{quizStyles}</style>
    </div>
  )
}

const quizStyles = `
  .quiz-start {
    max-width: 480px;
    margin: 0 auto;
    padding: 20px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
  }

  .start-card {
    background: white;
    border-radius: 28px;
    padding: 36px;
    box-shadow: var(--shadow-lg);
    border: 1.5px solid var(--chocolate-100);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
    width: 100%;
  }

  .start-card h1 { font-size: 1.5rem; font-weight: 800; color: var(--chocolate-600); margin: 0; }
  .start-card > p { color: var(--chocolate-400); font-weight: 600; margin: 0; }
  .not-enough { display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .not-enough > p { color: var(--chocolate-400); font-weight: 600; margin: 0; }
  .result-score { font-size: 2.5rem; font-weight: 800; color: var(--chocolate-600); }
  .result-acc { font-size: 1.2rem; font-weight: 800; }
  .wrong-list { width: 100%; background: var(--peach-50); border-radius: 16px; padding: 16px; text-align: left; }
  .wrong-list h3 { font-size: 0.9rem; font-weight: 800; color: var(--peach-500); margin: 0 0 10px; }
  .wrong-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .wrong-hanzi { font-size: 1.1rem; font-weight: 800; color: var(--chocolate-700); min-width: 40px; }
  .wrong-meaning { font-size: 0.85rem; color: var(--chocolate-500); font-weight: 700; }

  .quiz-session {
    max-width: 560px;
    margin: 0 auto;
    padding: 20px 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .quiz-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .back-btn { color: var(--chocolate-400); font-weight: 700; font-size: 0.875rem; text-decoration: none; white-space: nowrap; }
  .quiz-progress { flex: 1; }

  .quiz-card {
    background: white;
    border-radius: 24px;
    padding: 32px;
    box-shadow: var(--shadow-md);
    border: 1.5px solid var(--chocolate-100);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }

  .qc-label { font-size: 0.8rem; font-weight: 700; color: var(--chocolate-400); }
  .qc-hanzi { font-size: 3.5rem; font-weight: 800; color: var(--chocolate-700); line-height: 1; }
  .qc-pinyin { font-size: 1rem; color: var(--lavender-400); font-weight: 700; font-style: italic; }
  .qc-type { font-size: 0.72rem; background: var(--cheese-100); color: var(--chocolate-500); padding: 3px 10px; border-radius: 999px; font-weight: 700; }

  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .option-btn {
    padding: 14px 16px;
    border-radius: 18px;
    border: 1.5px solid var(--chocolate-200);
    background: white;
    color: var(--chocolate-600);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Nunito', sans-serif;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: var(--shadow-xs);
  }

  .option-btn:hover:not(:disabled) {
    border-color: var(--lavender-400);
    background: var(--lavender-50);
  }

  .option-btn.correct {
    background: var(--mint-50);
    border-color: var(--mint-400);
    color: var(--mint-500);
  }

  .option-btn.wrong {
    background: var(--peach-50);
    border-color: var(--peach-400);
    color: var(--peach-500);
  }

  .option-letter {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--cream);
    color: var(--chocolate-500);
    font-size: 0.78rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .quiz-feedback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .feedback-msg {
    font-size: 1rem;
    font-weight: 800;
    padding: 12px 20px;
    border-radius: 16px;
    text-align: center;
  }

  .feedback-msg.correct {
    background: var(--mint-50);
    color: var(--mint-500);
    border: 1.5px solid var(--mint-200);
  }

  .feedback-msg.wrong {
    background: var(--peach-50);
    color: var(--peach-500);
    border: 1.5px solid var(--peach-200);
  }
`
