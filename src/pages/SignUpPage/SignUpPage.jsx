import './SignUpPage.css'

function SignUpPage({ onNavigateToLogin, onSignup }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSignup?.()
  }

  return (
    <div className="signup-page">
      <div className="signup-left">
        <div className="auth-hero">
          <div className="auth-logo-wrap">
            <svg viewBox="0 0 48 48" className="auth-logo-icon" aria-hidden="true">
              <defs>
                <linearGradient id="authLogoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                fill="url(#authLogoGrad1)"
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
              <label className="signup-label" htmlFor="fullName">Full name</label>
              <input className="signup-input" id="fullName" name="fullName" placeholder="Enter your full name" />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="username">Username</label>
              <input className="signup-input" id="username" name="username" placeholder="Choose a username" />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="email">Email</label>
              <input className="signup-input" id="email" name="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="password">Password</label>
              <input className="signup-input" id="password" name="password" type="password" placeholder="••••••••" />
            </div>
            <div className="signup-field">
              <label className="signup-label" htmlFor="confirmPassword">Confirm password</label>
              <input className="signup-input" id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" />
            </div>
            <button type="submit" className="signup-btn">Create account</button>
          </form>

          <p className="signup-switch">
            Already have an account?{' '}
            <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); onNavigateToLogin?.(); }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
