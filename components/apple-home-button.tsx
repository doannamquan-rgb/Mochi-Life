'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function AppleHomeButton({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const lastClickTimeRef = useRef<number>(0)

  // Double click / Quick gesture handle: Return Home immediately
  function handleHomeClick(e: React.MouseEvent) {
    e.stopPropagation()
    const now = Date.now()
    if (now - lastClickTimeRef.current < 300) {
      // Double tap -> Go straight home
      setMenuOpen(false)
      router.push('/dashboard')
      toast.success('🏠 Đã quay về Trang chủ!')
      return
    }
    lastClickTimeRef.current = now
    setMenuOpen(prev => !prev)
  }

  // Swipe up gesture detection (like iOS Home Indicator swipe up)
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartY(e.touches[0].clientY)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY === null) return
    const touchEndY = e.changedTouches[0].clientY
    const deltaY = touchStartY - touchEndY
    if (deltaY > 50) {
      // Swiped up -> Quick return Home
      setMenuOpen(false)
      router.push('/dashboard')
      toast.success('🏠 Vuốt lên về Trang chủ!')
    }
    setTouchStartY(null)
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMenuOpen(false)
    toast.info('⬆️ Đã cuộn lên đầu trang')
  }

  const quickActions = [
    { label: 'Trang chủ', emoji: '🏠', href: '/dashboard', action: () => router.push('/dashboard') },
    { label: 'Mochi AI Coach', emoji: '🐱', href: '/ai', action: () => router.push('/ai') },
    { label: 'Học tiếng Trung', emoji: '🈶', href: '/chinese', action: () => router.push('/chinese') },
    { label: 'Ôn từ vựng', emoji: '🃏', href: '/chinese/review', action: () => router.push('/chinese/review') },
    { label: 'Ghi cân nặng', emoji: '⚖️', href: '/fitness/weight?action=add', action: () => router.push('/fitness/weight?action=add') },
    { label: 'Thêm buổi tập', emoji: '🏃', href: '/fitness/exercise?action=add', action: () => router.push('/fitness/exercise?action=add') },
    { label: 'Thêm giao dịch', emoji: '💸', href: '/expenses?action=add', action: () => router.push('/expenses?action=add') },
    { label: 'Tìm kiếm', emoji: '🔍', action: () => { setMenuOpen(false); onOpenSearch?.() } },
    { label: 'Cài đặt', emoji: '⚙️', href: '/settings', action: () => router.push('/settings') },
  ]

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="apple-home-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* AssistiveTouch Apple Quick Menu Grid Overlay */}
      {menuOpen && (
        <div className="apple-home-menu-overlay animate-scale-up">
          <div className="apple-home-menu-header">
            <div className="apple-indicator-bar" />
            <span className="apple-menu-title">Apple AssistiveTouch Quick Menu</span>
            <button className="apple-close-btn" onClick={() => setMenuOpen(false)}>✕</button>
          </div>

          <div className="apple-grid-menu">
            {quickActions.map((item, idx) => (
              <button
                key={idx}
                className="apple-grid-item"
                onClick={() => {
                  setMenuOpen(false)
                  item.action()
                }}
              >
                <div className="apple-grid-icon">{item.emoji}</div>
                <span className="apple-grid-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="apple-gesture-hint">
            💡 Nhấn 2 lần hoặc vuốt lên để quay về Trang chủ nhanh
          </div>
        </div>
      )}

      {/* Apple Home Yellow Semi-Circle Tab Button */}
      <div
        className="apple-home-tab-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          className={`apple-home-tab-btn ${menuOpen ? 'active' : ''}`}
          onClick={handleHomeClick}
          aria-label="Apple Home Button"
          title="Nút Home Apple - Nhấn để mở menu / Nhấn 2 lần để về trang chủ"
        >
          <div className="yellow-semi-circle" />
        </button>
      </div>

      <style jsx>{`
        .apple-home-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(40, 25, 15, 0.4);
          backdrop-filter: blur(6px);
          z-index: 100;
          animation: fadeIn 0.2s ease-out;
        }

        .apple-home-tab-container {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          pointer-events: auto;
        }

        .apple-home-tab-btn {
          background: transparent;
          border: none;
          padding: 0 16px 0;
          cursor: pointer;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          outline: none;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .apple-home-tab-btn:hover {
          transform: scale(1.2);
        }

        .apple-home-tab-btn:active {
          transform: scale(0.95);
        }

        /* Yellow Semi-Circle styling matching user screenshot */
        .yellow-semi-circle {
          width: 46px;
          height: 14px;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border-top-left-radius: 46px;
          border-top-right-radius: 46px;
          box-shadow: 0 -2px 10px rgba(255, 200, 0, 0.6), 0 0 14px rgba(255, 180, 0, 0.4);
          transition: all 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-bottom: none;
        }

        .apple-home-tab-btn:hover .yellow-semi-circle,
        .apple-home-tab-btn.active .yellow-semi-circle {
          height: 18px;
          background: linear-gradient(180deg, #FFE033 0%, #FF8C00 100%);
          box-shadow: 0 -4px 16px rgba(255, 215, 0, 0.9), 0 0 20px rgba(255, 165, 0, 0.7);
        }

        /* Apple AssistiveTouch Grid Overlay */
        .apple-home-menu-overlay {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 380px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 28px;
          padding: 20px 18px 16px;
          box-shadow: 0 20px 50px rgba(61, 43, 31, 0.25), 0 0 0 1.5px rgba(255, 255, 255, 0.6);
          z-index: 101;
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: var(--chocolate-600);
        }

        .apple-home-menu-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 100%;
        }

        .apple-indicator-bar {
          width: 40px;
          height: 4px;
          background: #E0D0C0;
          border-radius: 999px;
          margin-bottom: 8px;
        }

        .apple-menu-title {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--chocolate-400);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .apple-close-btn {
          position: absolute;
          right: 0;
          top: 0;
          background: var(--cream);
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-weight: 800;
          color: var(--chocolate-400);
          cursor: pointer;
        }

        .apple-grid-menu {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .apple-grid-item {
          background: var(--cream);
          border: 1.5px solid var(--chocolate-100);
          border-radius: 18px;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-family: inherit;
        }

        .apple-grid-item:hover {
          background: white;
          border-color: var(--cheese-300);
          transform: translateY(-2px) scale(1.03);
          box-shadow: var(--shadow-sm);
        }

        .apple-grid-item:active {
          transform: scale(0.95);
        }

        .apple-grid-icon {
          font-size: 1.6rem;
          line-height: 1;
        }

        .apple-grid-label {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--chocolate-600);
          text-align: center;
          line-height: 1.2;
        }

        .apple-gesture-hint {
          font-size: 0.7rem;
          color: var(--chocolate-400);
          text-align: center;
          font-weight: 600;
          background: rgba(255, 202, 26, 0.15);
          padding: 6px 12px;
          border-radius: 12px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }

        .animate-scale-up {
          animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </>
  )
}
