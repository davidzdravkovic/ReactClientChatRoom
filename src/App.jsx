import { useState, useEffect } from 'react'
import { connect } from './network/wsConnection'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ChatPage from './pages/ChatPage'

function App() {
  const [page, setPage] = useState('login')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    connect()
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
          setCurrentUser(null)
          setPage('login')
        }}
      />
    </div>
  )
}

export default App
