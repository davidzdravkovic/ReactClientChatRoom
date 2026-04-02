import { createContext, useContext } from 'react'

const ChatContext = createContext(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within a ChatContext.Provider')
  return ctx
}

export default ChatContext
