'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import { SearchPalette } from '@/components/search-palette'

const navItems = [
  { href: '/dashboard', label: 'Tổng quan', emoji: '🏠' },
  { href: '/fitness', label: 'Giảm cân', emoji: '💪' },
  { href: '/chinese', label: 'Tiếng Trung', emoji: '🈶' },
  { href: '/expenses', label: 'Chi tiêu', emoji: '💰' },
  { href: '/reports', label: 'Báo cáo', emoji: '📊' },
  { href: '/settings', label: 'Cài đặt', emoji: '⚙️' },
]

const bottomNavItems = [
  { href: '/dashboard', label: 'Tổng quan', emoji: '🏠' },
  { href: '/fitness', label: 'Giảm cân', emoji: '💪' },
  { href: '/chinese', label: 'Học', emoji: '🈶' },
  { href: '/expenses', label: 'Chi tiêu', emoji: '💰' },
  { href: '/reports', label: 'Báo cáo', emoji: '📊' },
]

const fabActions = [
  { label: 'Ghi cân nặng', emoji: '⚖️', href: '/fitness/weight?action=add' },
  { label: 'Thêm buổi tập', emoji: '🏃', href: '/fitness/exercise?action=add' },
  { label: 'Ghi buổi học', emoji: '📖', href: '/chinese/journal?action=add' },
  { label: 'Thêm từ vựng', emoji: '🈶', href: '/chinese/vocabulary?action=add' },
  { label: 'Thêm giao dịch', emoji: '💸', href: '/expenses?action=add' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading } = useUser()
  const [fabOpen, setFabOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Service Worker registration & Theme Sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service worker registration failed:', err)
      })
    }

    // Theme Sync: Only apply profile.theme if no local click override occurred in this session
    const localTheme = localStorage.getItem('mochi-theme') as 'light' | 'dark' | null
    if (profile?.theme) {
      if (!localTheme) {
        document.documentElement.setAttribute('data-theme', profile.theme)
        localStorage.setItem('mochi-theme', profile.theme)
      } else {
        document.documentElement.setAttribute('data-theme', localTheme)
      }
    } else if (localTheme) {
      document.documentElement.setAttribute('data-theme', localTheme)
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [profile])

  // Close FAB on route change
  useEffect(() => {
    setFabOpen(false)
    setSidebarOpen(false)
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Đã đăng xuất. Hẹn gặp lại! 🐱')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span className="animate-float" style={{ fontSize: '3rem' }}>🐱</span>
        <p>Đang tải Mochi Life...</p>
        <style jsx>{`
          .app-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: var(--cream);
            color: var(--chocolate-500);
            font-weight: 600;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`mochi-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="logo-emoji">🐱</span>
          <div>
            <div className="logo-title">Mochi Life</div>
            <div className="logo-subtitle">🌟 Sống vui mỗi ngày</div>
          </div>
        </div>

        {/* User info */}
        {profile && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} />
              ) : (
                <span>{profile.display_name?.[0]?.toUpperCase() ?? '🐱'}</span>
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{profile.display_name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="sidebar-nav">
          <button
            type="button"
            className="mochi-sidebar-item search-trigger-btn"
            onClick={() => setSearchOpen(true)}
            style={{ width: 'calc(100% - 16px)', border: 'none', background: 'var(--cheese-50)', color: 'var(--chocolate-600)', marginBottom: 8 }}
          >
            <span className="sidebar-item-emoji">🔍</span>
            <span>Tìm kiếm (Ctrl + K)</span>
          </button>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`mochi-sidebar-item ${
                pathname.startsWith(item.href) ? 'active' : ''
              }`}
            >
              <span className="sidebar-item-emoji">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="sidebar-bottom">
          <Link href="/achievements" className={`mochi-sidebar-item ${pathname.startsWith('/achievements') ? 'active' : ''}`}>
            <span className="sidebar-item-emoji">🏆</span>
            <span>Thành tích</span>
          </Link>
          <Link href="/calendar" className={`mochi-sidebar-item ${pathname.startsWith('/calendar') ? 'active' : ''}`}>
            <span className="sidebar-item-emoji">📅</span>
            <span>Lịch</span>
          </Link>
          <button className="mochi-sidebar-item logout-btn" onClick={handleLogout}>
            <span className="sidebar-item-emoji">👋</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="app-main">
        {/* Mobile header */}
        <header className="mobile-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Mở menu"
          >
            ☰
          </button>
          <Link href="/dashboard" className="mobile-logo">
            🐱 Mochi Life
          </Link>
          <button
            className="settings-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm"
          >
            🔍
          </button>
        </header>

        {children}
      </main>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />

      {/* FAB */}
      {fabOpen && (
        <div className="fab-backdrop" onClick={() => setFabOpen(false)} />
      )}

      {/* FAB Menu */}
      {fabOpen && (
        <div className="fab-menu">
          {fabActions.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className="fab-menu-item animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => setFabOpen(false)}
            >
              <span className="fab-menu-emoji">{action.emoji}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      )}

      <button
        className={`mochi-fab ${fabOpen ? 'fab-open' : ''}`}
        onClick={() => setFabOpen(!fabOpen)}
        aria-label="Thêm nhanh"
        id="fab-button"
      >
        {fabOpen ? '✕' : '+'}
      </button>

      {/* Bottom navigation (mobile) */}
      <nav className="mochi-bottom-nav">
        {bottomNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mochi-bottom-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1.3rem' }}>{item.emoji}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
          background: var(--cream);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(61, 43, 31, 0.3);
          z-index: 49;
          backdrop-filter: blur(2px);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px 16px;
          border-bottom: 1px solid var(--chocolate-100);
          margin-bottom: 8px;
        }

        .logo-emoji {
          font-size: 2rem;
          animation: mochi-float 3s ease-in-out infinite;
        }

        .logo-title {
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--chocolate-600);
          line-height: 1.2;
        }

        .logo-subtitle {
          font-size: 0.72rem;
          color: var(--chocolate-300);
          font-weight: 600;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 14px;
          margin: 0 8px 8px;
          background: var(--cream);
          border-radius: 16px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--cheese-200);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          color: var(--chocolate-600);
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-info {
          overflow: hidden;
        }

        .user-name {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--chocolate-600);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.72rem;
          color: var(--chocolate-300);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }

        .sidebar-item-emoji {
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar-bottom {
          border-top: 1px solid var(--chocolate-100);
          padding: 8px 0 12px;
          margin-top: 8px;
        }

        .logout-btn {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
          text-align: left;
        }

        .logout-btn:hover {
          color: var(--peach-400);
        }

        .app-main {
          flex: 1;
          margin-left: 240px;
          min-height: 100vh;
          padding: 24px;
          max-width: calc(100vw - 240px);
        }

        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0 16px;
          margin-bottom: 8px;
        }

        .hamburger-btn {
          background: none;
          border: none;
          font-size: 1.3rem;
          cursor: pointer;
          color: var(--chocolate-600);
          padding: 4px 8px;
        }

        .mobile-logo {
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--chocolate-600);
          text-decoration: none;
        }

        .settings-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--chocolate-500);
          padding: 4px 8px;
          text-decoration: none;
        }

        .fab-backdrop {
          position: fixed;
          inset: 0;
          z-index: 38;
        }

        .fab-menu {
          position: fixed;
          bottom: 148px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 41;
        }

        .fab-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          padding: 10px 16px;
          border-radius: 999px;
          box-shadow: 0 4px 16px rgba(61, 43, 31, 0.15);
          color: var(--chocolate-600);
          font-weight: 700;
          font-size: 0.875rem;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.15s;
          border: 1.5px solid var(--chocolate-100);
        }

        .fab-menu-item:hover {
          background: var(--cheese-50);
          transform: translateX(-4px);
        }

        .fab-menu-emoji {
          font-size: 1.1rem;
        }

        .fab-open {
          background: var(--peach-400) !important;
          transform: rotate(45deg);
        }

        @media (max-width: 767px) {
          .mochi-sidebar {
            transform: translateX(-100%);
            z-index: 50;
          }

          .mochi-sidebar.open {
            transform: translateX(0);
          }

          .app-main {
            margin-left: 0;
            padding: 12px 16px;
            padding-bottom: 80px;
            max-width: 100vw;
          }

          .mobile-header {
            display: flex;
          }

          .fab-menu {
            bottom: 148px;
          }

          .mochi-fab {
            bottom: 76px;
          }
        }
      `}</style>
    </div>
  )
}
