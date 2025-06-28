let ws: WebSocket | null = null;
let listeners: ((data: any) => void)[] = [];
let isConnected = false;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export function getTokenFromCookie(cookieName: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
  return match ? match[2] : null;
}

function connectWebSocket(token: string, onOpen?: () => void) {
  if (ws && isConnected) return ws;
  if (!token) throw new Error('No token provided for WebSocket connection');

  ws = new WebSocket(`${import.meta.env.VITE_WS_URL}?token=${token}`);

  ws.onopen = () => {
    isConnected = true;
    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((cb) => cb(data));
    } catch (e) {
      // ignore
    }
  };

  ws.onclose = () => {
    isConnected = false;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    // Optionally, try to reconnect after a delay
    reconnectTimeout = setTimeout(() => {
      if (token) connectWebSocket(token);
    }, 3000);
  };

  return ws;
}

export function initAdminWebSocket(cookieName = 'token', onOpen?: () => void) {
  const token = getTokenFromCookie(cookieName);
  if (!token) return null; // Don't throw, just skip connection
  return connectWebSocket(token, onOpen);
}

export function initCustomerWebSocket(customerToken: string = 'customertoken', onOpen?: () => void) {
  if (!customerToken) return null; // Don't throw, just skip connection
  return connectWebSocket(customerToken, onOpen);
}

export function subscribeWebSocket(cb: (data: any) => void) {
  listeners.push(cb);
}

export function unsubscribeWebSocket(cb: (data: any) => void) {
  listeners = listeners.filter((fn) => fn !== cb);
}

export function sendWebSocketMessage(msg: any) {
  if (ws && isConnected) {
    ws.send(JSON.stringify(msg));
  }
} 