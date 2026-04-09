export class PaginationSession {

  fetchType = 'initial'
  inFlight = false
  lastRequestedBeforeId = null
  lastRequestedNewerId = null
  lastSeenSentId = null

  constructor() {
  }

   requestOlder(messages) {
    if (this.inFlight) return null
    if (!messages?.length) return null
    const oldestId = messages[0].id
    if (oldestId == null) return null
    if (this.lastRequestedBeforeId === oldestId) return null
    this.lastRequestedBeforeId = oldestId
    this.fetchType = 'prepend'
    this.inFlight = true
    return oldestId
  }

  requestNewer(messages) {
    if (this.inFlight) return null
    if (!messages?.length) return null
    const lastReal = [...messages].reverse().find((m) => !m.temporaryId && m.id != null)
    if (!lastReal) return null
    const newestId = lastReal.id
    if (this.lastRequestedNewerId === newestId) return null
    this.lastRequestedNewerId = newestId
    this.fetchType = 'append'
    this.inFlight = true
    return newestId
  }

  onFetchResponse() {
    this.inFlight = false
    return null
  }
}
