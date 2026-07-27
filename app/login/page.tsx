'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email hoặc mật khẩu không đúng 😿')
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Vui lòng xác nhận email trước khi đăng nhập')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    toast.success('Chào mừng bạn trở lại! 🐱')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-bounce-in">
        {/* Logo */}
        <div className="auth-logo">
          <span className="mascot-emoji animate-float">🐱</span>
          <h1>Mochi Life</h1>
          <p>Chào mừng bạn trở lại!</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="mochi-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="mochi-input"
              placeholder="mochi@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="mochi-label" htmlFor="password">Mật khẩu</label>
            <div className="input-with-icon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="mochi-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="auth-forgot">
            <Link href="/forgot-password">Quên mật khẩu?</Link>
          </div>

          <button
            type="submit"
            className="mochi-btn mochi-btn-primary mochi-btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-dots">Đang đăng nhập<span>...</span></span>
            ) : (
              <>🐱 Đăng nhập</>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <p className="auth-switch">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="auth-link">Đăng ký ngay</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          background: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-image: radial-gradient(circle at 20% 20%, #FFF5CC 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, #FFE4DC 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, #EDFAF5 0%, transparent 70%);
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: white;
          border-radius: 28px;
          padding: 40px;
          box-shadow: 0 8px 40px rgba(61, 43, 31, 0.12);
          border: 1.5px solid var(--chocolate-100);
        }

        .auth-logo {
          text-align: center;
          margin-bottom: 32px;
        }

        .mascot-emoji {
          display: inline-block;
          font-size: 3.5rem;
          margin-bottom: 12px;
        }

        .auth-logo h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0 0 6px;
          letter-spacing: -0.5px;
        }

        .auth-logo p {
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-with-icon .mochi-input {
          padding-right: 44px;
        }

        .input-icon-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;
          color: var(--chocolate-400);
          transition: color 0.15s;
        }

        .input-icon-btn:hover {
          color: var(--chocolate-600);
        }

        .auth-forgot {
          text-align: right;
          margin-top: -6px;
        }

        .auth-forgot a {
          font-size: 0.85rem;
          color: var(--chocolate-400);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }

        .auth-forgot a:hover {
          color: var(--cheese-500);
        }

        .auth-submit-btn {
          width: 100%;
          margin-top: 4px;
          font-size: 1rem;
          padding: 14px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          gap: 12px;
          color: var(--chocolate-300);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--chocolate-100);
        }

        .auth-switch {
          text-align: center;
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 0;
          font-size: 0.9rem;
        }

        .auth-link {
          color: var(--cheese-500);
          font-weight: 700;
          text-decoration: none;
          transition: color 0.15s;
        }

        .auth-link:hover {
          color: var(--cheese-400);
          text-decoration: underline;
        }

        .loading-dots {
          display: inline-flex;
          align-items: center;
        }

        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      `}</style>
    </div>
  )
}
