import { PaginationSession } from './PaginationSession'
//ONE SINGLE CHAT SESSION
//Single instance represenst active chat session with peer
//The boundaries on each logical state of the lifecycle of a session
//For pagination, epoch is used to accept just fetches to this session, pagination instance tells the merge type
//also is stateful for seen, on append and on prepend fetch.
//For sending each transition has its own rule all depending on existance of CHATROOM_ID
//This instance receives null for CHATROOM_ID if if prefetch and finally decided at fetch finish the actual type
export class ChatSessionEnvironment {
  static nextConversationEpoch = 0

  constructor(chatRoomId, correspondentName) {
    this.chatView =`initial`
    this.subState = null
    this.chatAcknowledge = false
    this.firstOptimistic = true
    this.pendingSeed = false
    this.chatRoomId = chatRoomId ?? null
    this.peerUserName = correspondentName 
    this.conversationEpoch = ++ChatSessionEnvironment.nextConversationEpoch
    this.chatSessionId = `${chatRoomId}:${this.conversationEpoch}`
    this.pagination = new PaginationSession()
  }

  fetchResponseCheck(echoedChatIdentifier) {
    const stale =
      echoedChatIdentifier !== undefined &&
      echoedChatIdentifier !== this.conversationEpoch
    const validSession = !stale
    const mergeMode = this.pagination.fetchType ?? 'initial'
    if (validSession) {
      this.pagination.onFetchResponse()
    }
    return { validSession, mergeMode }
  }

}
