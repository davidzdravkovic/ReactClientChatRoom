/** Dev: direct to C++. Behind nginx: e.g. VITE_WS_URL=ws://localhost/ws */
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:12346/';

let ws = null;
let isReady = false;
let sessionId = null;
let hasReceivedSessionId = false;

const messageListeners = new Set();
const connectionCallback = new Set();


export function connect() {
  if (ws) return ws;

  ws = new WebSocket(WS_URL);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    isReady = true;
    console.log('WebSocket connected');
  };

  ws.onmessage = async (event) => {
    if (!hasReceivedSessionId) {
      const idOrPromise = extractSessionId(event);
      const id = idOrPromise instanceof Promise ? await idOrPromise : idOrPromise;

      if (id != null) {
        sessionId = id;
        hasReceivedSessionId = true;
        console.log('Session ID received:', id);
        connectionCallback.forEach((cb)=>cb());
      }
      return;
    }

    handleGeneralMessage(event);
  };

  ws.onclose = () => {
    isReady = false;
    ws = null;
    console.log('WebSocket closed');
  };

  ws.onerror = (err) => {
    isReady = false;
    console.error('WebSocket error', err);
  };

}


function extractSessionId(event) {
  // Binary ArrayBuffer
  if (event.data instanceof ArrayBuffer) {
    const view = new DataView(event.data);
    return view.getUint32(0, true); // little-endian
  }

  // Blob
  else if (event.data instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const view = new DataView(reader.result);
        resolve(view.getUint32(0, true));
      };
      reader.readAsArrayBuffer(event.data);
    });
  }

  // Uint8Array
  else if (event.data instanceof Uint8Array) {
    const buffer = event.data.buffer;
    const view = new DataView(buffer);
    return view.getUint32(0, true);
  }

  // String frame (likely from server sending text frame)
  else if (typeof event.data === 'string') {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(event.data).buffer;
    const view = new DataView(buffer);
    return view.getUint32(0, true);
  }

  else {
    console.warn('Unknown first message type, cannot extract session ID', event.data);
    return null;
  }
}

// ---- Handle general messages ----
function handleGeneralMessage(event) {
  messageListeners.forEach((cb) => cb(event));
}

// ---- Send binary message ----
export function sendMessage(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(data);
  } else {
    console.warn('WebSocket not open, cannot send message');
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
export function subscribeConnection (callback) {
  connectionCallback.add(callback);
  if(hasReceivedSessionId) {
     callback();
  }
  
  return () => connectionCallback.delete(callback);
}
