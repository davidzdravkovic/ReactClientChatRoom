import { PaginationSession } from './PaginationSession'

export class ChatSessionEnvironment {
  static nextConversationEpoch = 0

  constructor({ chat }) {
    this.initialFetchDone = false
    this.state = `transitioning`
    this.subState = null
    this.chatRoomId = chat?.chatRoomId ?? null
    this.peerUserName = chat.correspondentName 
    this.conversationEpoch = ++ChatSessionEnvironment.nextConversationEpoch
    this.chatSessionId = `${chat?.chatRoomId}:${this.conversationEpoch}`
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

  alreadyFetchedInitial() {
    return this.initialFetchDone
  }

  setInitialFetchDone() {
    this.initialFetchDone = true
  }
}
