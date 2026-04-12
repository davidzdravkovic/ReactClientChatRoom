import './SignUpPage.css'
import { useState, useEffect } from 'react'
import { createCreateStruct } from '../../Dto/dto'
import {
  getSessionId,
  sendMessage,
  subscribeMessages,
  subscribeConnection,
} from '../../network/wsConnection'

function SignUpPage({ onNavigateToLogin, onLogin }) {
  const [connection, setConnection] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeConnection(() => {
      setConnection(true)
      setConnectionError(false)
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!connection) {
      setConnectionError(true)
      return
    }

    const fullName = e.target.fullName.value.trim()
    const username = e.target.username.value.trim()
    const email = e.target.email.value.trim()
    const password = e.target.password.value
    const confirmPassword = e.target.confirmPassword.value

    if (!fullName) {
      alert('Full name is required')
      return
    }
    if (!username) {
      alert('Username is required')
      return
    }
    if (!email) {
      alert('Email is required')
      return
    }
    if (!password) {
      alert('Password is required')
      return
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    const createDTO = createCreateStruct(username, password, fullName, email, getSessionId())

    const unsubscribe = subscribeMessages((payload) => {
      let msg
      try {
        msg = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data
      } catch {
        return
      }
      if (!msg) return

      const isSuccess = msg.response === 'CREATE_RESPONSE' && msg.status === 'SUCCESS'
      const isFailure = msg.response === 'CREATE_RESPONSE' && msg.status !== 'SUCCESS'

      if (isSuccess) {
        const userData = Array.isArray(msg.data) && msg.data[0] ? msg.data[0] : {}
        const token = userData.token
        if (token) {
          localStorage.setItem('jwt', token)
        }
        localStorage.setItem('sessionId', String(getSessionId()))
        onLogin?.({
          userName: userData.userName ?? username,
          fullName: userData.name ?? fullName,
          userId: userData.userId != null ? Number(userData.userId) : null,
          token: token ?? null,
        })
        unsubscribe()
      } else if (isFailure) {
        const err = msg.data?.[0]?.error ?? msg.error ?? 'Could not create account'
        alert('Sign up failed: ' + err)
        unsubscribe()
      }
    })

    sendMessage(JSON.stringify(createDTO), { attachToken: false })
  }

  return (
    <div className="signup-page">
      <div className="signup-left">
        <div className="auth-hero">
          <div className="auth-logo-wrap">
            <svg viewBox="0 0 48 48" className="auth-logo-icon" aria-hidden="true">
              <defs>
                <linearGradient id="signupAuthLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                fill="url(#signupAuthLogoGrad)"
                d="M24 4C13.5 4 5 12.5 5 23c0 4.2 1.4 8.1 3.7 11.2L4 44l10.2-4.4C17.8 41 20.8 42 24 42c10.5 0 19-8.5 19-19S34.5 4 24 4z"
              />
              <circle cx="18" cy="23" r="2.5" fill="white" opacity="0.9" />
              <circle cx="24" cy="23" r="2.5" fill="white" opacity="0.9" />
              <circle cx="30" cy="23" r="2.5" fill="white" opacity="0.9" />
            </svg>
          </div>
          <h1 className="auth-brand">Echo</h1>
          <p className="auth-tagline">Create your account</p>
        </div>
      </div>
      <div className="signup-right">
        <div className="signup-card">
          <h2 className="signup-title">Create account</h2>
          <p className="signup-subtitle">Welcome onboard</p>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-field">
              <label className="signup-label" htmlFor="fullName">
                Full name
              </label>
              <input
                className="signup-input"
                id="fullName"
                name="fullName"
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="username">
                Username
              </label>
              <input
                className="signup-input"
                id="username"
                name="username"
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="email">
                Email
              </label>
              <input
                className="signup-input"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="password">
                Password
              </label>
              <input
                className="signup-input"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                className="signup-input"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="signup-btn">
              Create account
            </button>
            {connectionError && (
              <p className="signup-error" role="alert">
                Connection problem. Check your network and try again.
              </p>
            )}
          </form>

          <p className="signup-switch">
            Already have an account?{' '}
            <a
              href="#"
              className="signup-link"
              onClick={(e) => {
                e.preventDefault()
                onNavigateToLogin?.()
              }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
