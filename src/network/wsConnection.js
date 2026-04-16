import { devError, devLog, devWarn } from '../utils/logger'

/** Dev: direct to C++. Behind nginx: e.g. VITE_WS_URL=ws://localhost/ws */
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:12346/';

let ws = null;
let isReady = false;
let sessionId = null;
let hasReceivedSessionId = false;

const messageListeners = new Set();
const connectionCallback = new Set();
const disconnectionListeners = new Set();

function bindSocketHandlers(socket) {
  const socketRef = socket

  socket.onopen = () => {
    if (ws !== socketRef) return
    isReady = true
    devLog('WebSocket connected')
  }

  socket.onmessage = (event) => {
    if (ws !== socketRef) return
    if (!hasReceivedSessionId) {
      if (typeof event.data !== 'string') {
        devWarn('Expected text SESSION_INIT frame, got:', event.data)
        return
      }
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.type === 'SESSION_INIT' && msg.sessionId != null) {
        sessionId = Number(msg.sessionId)
        hasReceivedSessionId = true
        devLog('Session ID received:', sessionId)
        connectionCallback.forEach((cb) => cb())
      }
      return
    }

    handleGeneralMessage(event)
  }

  socket.onclose = () => {
    if (ws !== socketRef) return
    isReady = false
    ws = null
    sessionId = null
    hasReceivedSessionId = false
    disconnectionListeners.forEach((cb) => cb())
    devLog('WebSocket closed')
  }

  socket.onerror = (err) => {
    if (ws !== socketRef) return
    isReady = false
    devError('WebSocket error', err)
  }
}

/**
 * Opens or reuses the WebSocket. Call after logout/server close so login/signup can get SESSION_INIT again.
 * Old sockets in CLOSING/CLOSED do not block opening a new one; stale onclose cannot clear a newer socket.
 */
export function connect() {
  if (ws) {
    const state = ws.readyState
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
      return ws
    }
  }

  const socket = new WebSocket(WS_URL)
  ws = socket
  bindSocketHandlers(socket)
  return ws
}

// ---- Handle general messages ----
function handleGeneralMessage(event) {
  messageListeners.forEach((cb) => cb(event));
}

// ---- Send JSON over WebSocket (optional JWT; sessionId stays in the DTO) ----
export function sendMessage(data, { attachToken = true } = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const token = sessionStorage.getItem('jwt');

    let payload;

    if (typeof data === 'object') {
      payload = attachToken && token ? { ...data, token } : data;
    } else {
      try {
        const parsed = JSON.parse(data);
        payload = attachToken && token ? { ...parsed, token } : parsed;
      } catch {
        payload = data;
      }
    }

    ws.send(
      typeof payload === 'string' ? payload : JSON.stringify(payload)
    );
  } else {
    devWarn('WebSocket not open, cannot send message');
  }
}

// ---- Subscribe to messages ----
export function subscribeMessages(callback) {
  messageListeners.add(callback);
  return () => messageListeners.delete(callback);
}

// ---- Accessors ----
export function getIsReady() {
  return isReady;
}

export function getSessionId() {
  return sessionId;
}
export function subscribeConnection(callback) {
  connectionCallback.add(callback)
  if (hasReceivedSessionId) {
    callback()
  }

  return () => connectionCallback.delete(callback)
}

/** Fires when the socket closes or is replaced; use to clear UI and call connect() again. */
export function subscribeDisconnection(callback) {
  disconnectionListeners.add(callback)
  return () => disconnectionListeners.delete(callback)
}
