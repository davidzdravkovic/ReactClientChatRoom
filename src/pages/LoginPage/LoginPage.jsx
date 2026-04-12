import './LoginPage.css'
import { createLogStruct } from "../../Dto/dto";
import {useState,useEffect} from 'react';
import { getSessionId, sendMessage,  subscribeMessages,subscribeConnection} from "../../network/wsConnection";


function LoginPage({ onNavigateToSignup, onLogin }) {
  const [connection, setConnection] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeConnection(() => {
      setConnection(true);
      setConnectionError(false);
    });
    return () => unsubscribe();
  }, []);

const handleSubmit = (e) => {
  e.preventDefault();

  if (!connection) {
    setConnectionError(true);
    return;
  }

  const username = e.target.username.value;
  const password = e.target.password.value;

  if (!username) {
    alert("Username is required");
    return;
  }

  if (!password) {
    alert("Password is required");
    return;
  }

  // 1. Create login DTO
  const loginDTO = createLogStruct(username, password, getSessionId());

  // 2. Subscribe to server response
  const unsubscribe = subscribeMessages((payload) => {
    let msg;

    try {
      msg = typeof payload.data === "string"
        ? JSON.parse(payload.data)
        : payload.data;
    } catch {
      return;
    }

    if (!msg) return;

    const isSuccess =
      msg.response === "LOGIN_RESPONSE" && msg.status === "SUCCESS";

    const isFailure =
      msg.response === "LOGIN_RESPONSE" && msg.status !== "SUCCESS";

    if (isSuccess) {
      const userData =
        Array.isArray(msg.data) && msg.data[0] ? msg.data[0] : {};

      // ✅ STORE TOKEN
      const token = userData.token;
      if (token) {
        localStorage.setItem("jwt", token);
      }

      localStorage.setItem("sessionId", String(getSessionId()));

      // ✅ PASS EVERYTHING TO APP STATE
      onLogin?.({
        userName: userData.userName ?? username,
        fullName: userData.name ?? userData.userName ?? username,
        userId: userData.userId != null ? Number(userData.userId) : null,
        token: token ?? null,
      });

      unsubscribe();
      return;
    }

    if (isFailure) {
      const err =
        msg.data?.[0]?.error ?? msg.error ?? "Invalid credentials";

      alert("Login failed: " + err);

      unsubscribe();
      return;
    }
  });

  // 3. Send login request (no JWT — user is not authenticated yet)
  sendMessage(JSON.stringify(loginDTO), { attachToken: false });
};
  return (
    <div className="login-page">
      <div className="login-left">
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
          <p className="auth-tagline">Sign in to continue</p>
        </div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-title">Sign in</h2>
          <p className="login-subtitle">Welcome back</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="username">Username</label>
              <input className="login-input" id="username" name="username" placeholder="Enter your username" />
            </div>
            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <input className="login-input" id="password" name="password" type="password" placeholder="••••••••" />
            </div>
            <div className="login-row">
              <label className="login-check">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="login-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
           <button type="submit" className="login-btn" >Sign in</button>
            {connectionError && (
              <p className="login-error" role="alert">
                Connection problem. Check your network and try again.
              </p>
            )}
          </form>

          <p className="login-switch">
            Don&apos;t have an account?{' '}
            <a href="#" className="login-link login-link--accent" onClick={(e) => { e.preventDefault(); onNavigateToSignup?.(); }}>
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
