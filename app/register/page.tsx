'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate(): string | null {
    if (!displayName.trim()) return 'Vui lòng nhập tên hiển thị'
    if (!email) return 'Vui lòng nhập email'
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự'
    if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp'
    return null
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        toast.error('Email này đã được đăng ký. Bạn có muốn đăng nhập không?')
      } else {
        toast.error(signUpError.message)
      }
      setLoading(false)
      return
    }

    toast.success('Đăng ký thành công! Chào mừng bạn đến Mochi Life 🐱')
    router.push('/onboarding')
    router.refresh()
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="auth-page">
      <div className="auth-card animate-bounce-in">
        <div className="auth-logo">
          <span className="mascot-emoji animate-float">🐱</span>
          <h1>Tạo tài khoản</h1>
          <p>Bắt đầu hành trình cùng Mochi nào!</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label className="mochi-label" htmlFor="displayName">Tên của bạn</label>
            <input
              id="displayName"
              type="text"
              className="mochi-input"
              placeholder="Ví dụ: Mochi"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>

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
            />
          </div>

          <div className="form-group">
            <label className="mochi-label" htmlFor="password">Mật khẩu</label>
            <div className="input-with-icon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="mochi-input"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Hiện/Ẩn mật khẩu"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className={`strength-fill strength-${passwordStrength.level}`}
                    style={{ width: `${passwordStrength.percent}%` }}
                  />
                </div>
                <span className={`strength-label strength-text-${passwordStrength.level}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="mochi-label" htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              className={`mochi-input ${confirmPassword && confirmPassword !== password ? 'error' : ''}`}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && confirmPassword !== password && (
              <span className="mochi-error-text">Mật khẩu không khớp 😿</span>
            )}
          </div>

          <button
            type="submit"
            className="mochi-btn mochi-btn-primary mochi-btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Đang tạo tài khoản...' : '🐱 Bắt đầu thôi!'}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản?{' '}
          <Link href="/login" className="auth-link">Đăng nhập</Link>
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
                            radial-gradient(circle at 80% 80%, #FFE4DC 0%, transparent 50%);
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
          margin-bottom: 28px;
        }

        .mascot-emoji {
          display: inline-block;
          font-size: 3rem;
          margin-bottom: 10px;
        }

        .auth-logo h1 {
          font-size: 1.7rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0 0 4px;
        }

        .auth-logo p {
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 0;
          font-size: 0.9rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
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
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .strength-bar {
          flex: 1;
          height: 4px;
          background: var(--chocolate-100);
          border-radius: 999px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease, background 0.3s ease;
        }

        .strength-weak { background: var(--peach-400); }
        .strength-fair { background: var(--cheese-400); }
        .strength-good { background: var(--mint-400); }
        .strength-strong { background: var(--lavender-400); }

        .strength-label {
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .strength-text-weak { color: var(--peach-400); }
        .strength-text-fair { color: var(--cheese-500); }
        .strength-text-good { color: var(--mint-400); }
        .strength-text-strong { color: var(--lavender-400); }

        .auth-submit-btn {
          width: 100%;
          margin-top: 4px;
          font-size: 1rem;
          padding: 14px;
        }

        .auth-switch {
          text-align: center;
          color: var(--chocolate-400);
          font-weight: 600;
          margin: 16px 0 0;
          font-size: 0.9rem;
        }

        .auth-link {
          color: var(--cheese-500);
          font-weight: 700;
          text-decoration: none;
        }

        .auth-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

function getPasswordStrength(password: string): { level: string; label: string; percent: number } {
  if (!password) return { level: 'weak', label: '', percent: 0 }
  
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 'weak', label: 'Yếu', percent: 25 }
  if (score <= 2) return { level: 'fair', label: 'Trung bình', percent: 50 }
  if (score <= 3) return { level: 'good', label: 'Tốt', percent: 75 }
  return { level: 'strong', label: 'Mạnh', percent: 100 }
}
