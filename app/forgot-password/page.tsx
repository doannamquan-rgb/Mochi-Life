'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      toast.error('Vui lòng nhập email')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.')
      setLoading(false)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-bounce-in">
          <div className="success-state">
            <span className="success-emoji animate-float">📧</span>
            <h2>Kiểm tra email nhé!</h2>
            <p>
              Chúng tớ đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>.
              Kiểm tra cả hộp thư spam nha bạn ơi 🐱
            </p>
            <Link href="/login" className="mochi-btn mochi-btn-primary">
              Quay lại đăng nhập
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
          <span className="mascot-emoji animate-float">😿</span>
          <h1>Quên mật khẩu?</h1>
          <p>Nhập email để đặt lại mật khẩu nhé</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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

          <button
            type="submit"
            className="mochi-btn mochi-btn-primary mochi-btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Đang gửi...' : '📧 Gửi link đặt lại'}
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
