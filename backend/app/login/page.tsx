'use client'

import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signIn('credentials', { email, password, redirect: false })

    setSubmitting(false)

    if (result?.error) {
      setError('Incorrect email or password')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="lh-login-screen">
      <div className="lh-login-card">
        <div className="lh-login-mark">
          <span>L</span>
        </div>
        <h1 className="lh-login-title">Larabby Hotel</h1>
        <p className="lh-login-sub">Sign in to the front desk dashboard</p>

        {error && <div className="lh-login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="lh-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="lh-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="lh-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
