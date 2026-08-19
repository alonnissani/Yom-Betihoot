import { io } from 'socket.io-client';
import { useEffect, useRef, useState, useCallback } from 'react';

export const socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });

const TOKEN_KEY = 'z2h.participant';

export function readToken() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
}
export function writeToken(v) {
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(v)); } catch { /* מצב פרטי */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

/** מנוי על מצב השרת עבור תפקיד מסוים. hello נשלח מחדש בכל reconnect. */
export function useServerState(role, helloPayload = {}) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const payloadRef = useRef(helloPayload);
  payloadRef.current = helloPayload;

  useEffect(() => {
    const onState = (s) => setState(s);
    const onConnect = () => {
      setConnected(true);
      if (role) socket.emit('hello', { role, ...payloadRef.current });
    };
    const onDisconnect = () => setConnected(false);

    socket.on('state', onState);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected && role) socket.emit('hello', { role, ...payloadRef.current });

    return () => {
      socket.off('state', onState);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [role]);

  return { state, connected, setState };
}

export function emit(event, payload) {
  return new Promise((resolve) => {
    socket.timeout(6000).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, reason: 'timeout' });
      else resolve(res || { ok: false, reason: 'no-response' });
    });
  });
}
