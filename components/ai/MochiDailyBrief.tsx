'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Highlight = {
  type: string
  title: string
  description: string
}

type DailyBriefData = {
  summary: string
  highlights: Highlight[]
  recommendation: string
  insights: Array<{
    type: string
    icon: string
    title: string
    description: string
  }>
  isAiGenerated: boolean
}

export function MochiDailyBrief({ userId }: { userId: string }) {
  const [brief, setBrief] = useState<DailyBriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return

    const todayStr = new Date().toISOString().split('T')[0]
    const cacheKey = `mochi_brief_cache_${userId}_${todayStr}`

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setBrief(JSON.parse(cached))
        setLoading(false)
        return
      }
    } catch {
      // Ignore sessionStorage error
    }

    // Fetch brief from API
    let isMounted = true
    setLoading(true)

    fetch('/api/ai/daily-brief')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        if (data.error) {
          setError(true)
        } else {
          setBrief(data)
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(data))
          } catch {}
        }
      })
      .catch(() => {
        if (isMounted) setError(true)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  if (loading) {
    return (
      <div className="brief-card loading-card">
        <div className="brief-header">
          <div className="mochi-skeleton" style={{ width: 140, height: 24 }} />
          <div className="mochi-skeleton" style={{ width: 80, height: 24 }} />
        </div>
        <div className="brief-body">
          <div className="mochi-skeleton" style={{ height: 18, marginBottom: 8 }} />
          <div className="mochi-skeleton" style={{ height: 18, width: '80%' }} />
        </div>
      </div>
    )
  }

  if (error || !brief) {
    return (
      <div className="brief-card">
        <div className="brief-header">
          <div className="brief-title">
            <span className="brief-icon animate-float">🐱</span>
            <span>Mochi hôm nay</span>
          </div>
          <Link href="/ai" className="ask-btn">
            💬 Hỏi Mochi
          </Link>
        </div>
        <p className="brief-error">Mochi AI chưa thể tải bản tin hôm nay. Bạn có thể trò chuyện trực tiếp với Mochi nhé!</p>
        <style jsx>{`
          .brief-card {
            background: white;
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1.5px solid var(--chocolate-100);
            box-shadow: var(--shadow-sm);
          }
          .brief-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .brief-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1rem;
            font-weight: 800;
            color: var(--chocolate-600);
          }
          .brief-icon {
            font-size: 1.5rem;
          }
          .ask-btn {
            background: var(--cheese-200);
            color: var(--chocolate-600);
            padding: 6px 14px;
            border-radius: 14px;
            font-size: 0.82rem;
            font-weight: 800;
            text-decoration: none;
          }
          .brief-error {
            color: var(--chocolate-400);
            font-size: 0.85rem;
            margin-top: 10px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="brief-card animate-slide-up">
      <div className="brief-header">
        <div className="brief-title">
          <span className="brief-icon animate-float">🐱</span>
          <span>Mochi hôm nay</span>
          {brief.isAiGenerated && (
            <span className="ai-badge">✨ Gemini AI</span>
          )}
        </div>
        <Link href="/ai" className="ask-btn">
          💬 Hỏi Mochi
        </Link>
      </div>

      {/* Highlights Badges */}
      {brief.highlights && brief.highlights.length > 0 && (
        <div className="highlights-grid">
          {brief.highlights.map((h, i) => (
            <div key={i} className={`highlight-chip chip-${h.type || 'general'}`}>
              <span className="chip-title">{h.title}:</span> {h.description}
            </div>
          ))}
        </div>
      )}

      {/* Recommendation Box */}
      {brief.recommendation && (
        <div className="recommendation-box">
          <span className="rec-icon">✨</span>
          <p className="rec-text">{brief.recommendation}</p>
        </div>
      )}

      <style jsx>{`
        .brief-card {
          background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%);
          border-radius: 24px;
          padding: 22px;
          margin-bottom: 24px;
          border: 2px solid var(--cheese-200);
          box-shadow: var(--shadow-sm);
        }

        .loading-card {
          min-height: 120px;
        }

        .brief-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .brief-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--chocolate-600);
        }

        .brief-icon {
          font-size: 1.6rem;
        }

        .ai-badge {
          font-size: 0.68rem;
          background: var(--lavender-100);
          color: var(--lavender-600);
          padding: 3px 8px;
          border-radius: 8px;
          font-weight: 700;
        }

        .ask-btn {
          background: var(--cheese-300);
          color: var(--chocolate-600);
          padding: 8px 16px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .ask-btn:hover {
          background: var(--cheese-400);
          transform: translateY(-1px);
        }

        .highlights-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }

        .highlight-chip {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--chocolate-600);
          background: var(--cream);
          border: 1px solid var(--chocolate-100);
        }

        .chip-study { background: var(--lavender-50); border-color: var(--lavender-200); }
        .chip-fitness { background: var(--peach-50); border-color: var(--peach-200); }
        .chip-finance { background: var(--mint-50); border-color: var(--mint-200); }

        .chip-title {
          font-weight: 800;
        }

        .recommendation-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: white;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid var(--cheese-200);
        }

        .rec-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .rec-text {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--chocolate-600);
          margin: 0;
          line-height: 1.45;
        }

        @media (max-width: 640px) {
          .brief-card {
            padding: 16px;
          }
          .brief-title {
            font-size: 1rem;
          }
          .ask-btn {
            padding: 6px 12px;
            font-size: 0.78rem;
          }
        }
      `}</style>
    </div>
  )
}
