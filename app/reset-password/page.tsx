'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session
      if (!session) {
        // If there's no session from the recovery link, let's wait a moment for Supabase SSR/hash parsing
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        if (!hash || !hash.includes('access_token')) {
          setVerifying(false)
        }
      } else {
        setVerifying(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setVerifying(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      toast.error(error.message || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.')
      setLoading(false)
      return
    }

    toast.success('Đặt lại mật khẩu thành công! 🐱🎉')
    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  if (verifying) {
    return (
      <div className="auth-page">
        <div className="auth-card text-center">
          <span className="mascot-emoji animate-float">🐱</span>
          <h2>Đang xác thực liên kết...</h2>
          <p>Chờ xíu nhé bạn ơi!</p>
        </div>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-bounce-in">
          <div className="success-state">
            <span className="success-emoji animate-float">🎉</span>
            <h2>Thành công rồi!</h2>
            <p>Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng vào bảng điều khiển...</p>
            <Link href="/dashboard" className="mochi-btn mochi-btn-primary">
              Vào Dashboard ngay
            </Link>
          </div>
        </div>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-bounce-in">
        <div className="auth-logo">
          <span className="mascot-emoji animate-float">🔐</span>
          <h1>Đặt lại mật khẩu</h1>
          <p>Nhập mật khẩu mới cho tài khoản Mochi Life của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="mochi-label" htmlFor="password">Mật khẩu mới</label>
            <input
              id="password"
              type="password"
              className="mochi-input"
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="mochi-label" htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
            <input
              id="confirmPassword"
              type="password"
              className="mochi-input"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="mochi-btn mochi-btn-primary mochi-btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : '✨ Cập nhật mật khẩu'}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/login" className="auth-link">← Quay lại đăng nhập</Link>
        </p>
      </div>

      <style jsx>{baseStyles}</style>
    </div>
  )
}

const baseStyles = `
  .auth-page {
    min-height: 100vh;
    background: var(--cream);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-image: radial-gradient(circle at 20% 20%, #FFF5CC 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, #E8E0FF 0%, transparent 50%);
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
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .auth-submit-btn {
    width: 100%;
    font-size: 1rem;
    padding: 14px;
  }

  .auth-switch {
    text-align: center;
    color: var(--chocolate-400);
    font-weight: 600;
    margin: 20px 0 0;
  }

  .auth-link {
    color: var(--cheese-500);
    font-weight: 700;
    text-decoration: none;
  }

  .success-state {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .success-emoji {
    font-size: 4rem;
    display: inline-block;
  }

  .success-state h2 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--chocolate-600);
    margin: 0;
  }

  .success-state p {
    color: var(--chocolate-400);
    font-weight: 600;
    margin: 0;
    line-height: 1.6;
    max-width: 320px;
  }
`
