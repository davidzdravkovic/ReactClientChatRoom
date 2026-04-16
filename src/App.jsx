import { useState, useEffect } from 'react'
import { connect, sendMessage, getSessionId } from './network/wsConnection'
import { createLogoutRequest } from './Dto/dto'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ChatPage from './pages/ChatPage'

function clearSessionAuth() {
  sessionStorage.removeItem('jwt')
  sessionStorage.removeItem('sessionId')
}

function App() {
  const [page, setPage] = useState('login')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    connect()
  }, [])

  useEffect(() => {
    if (page === 'login' || page === 'signup') {
      connect()
    }
  }, [page])

  useEffect(() => {
    return () => clearSessionAuth()
  }, [])

  useEffect(() => {
    if (page === 'chat' && !currentUser) {
      setPage('login')
    }
  }, [page, currentUser])



  // --- render pages based on state ---
  if (page === 'login') {
    return (
      <LoginPage
        onNavigateToSignup={() => setPage('signup')}
        onLogin={(userData) => {
          setCurrentUser(userData)
          setPage('chat')
        }}
      />
    )
  }

  if (page === 'signup') {
    return (
      <SignUpPage
        onNavigateToLogin={() => setPage('login')}
          onLogin={(userData) => {
          setCurrentUser(userData)
          setPage('chat')
        }}
      />
    )
  }

  return (
    <div className="app-chat-wrapper">
      <ChatPage
        currentUser={currentUser}
        onLogout={() => {
          const token = sessionStorage.getItem('jwt')
          const sid = getSessionId()
          if (token && sid != null) {
            sendMessage(JSON.stringify(createLogoutRequest(sid)))
          }
          clearSessionAuth()
          setCurrentUser(null)
          setPage('login')
        }}
      />
    </div>
  )
}

export default App
