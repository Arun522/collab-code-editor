import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket(slug) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !slug) return;

    const serverUrl = import.meta.env.VITE_API_URL || '';
    const socket = io(`${serverUrl}/editor`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      socket.emit('join-room', { slug });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('reconnect_attempt', () => {
      setReconnecting(true);
    });

    socket.on('reconnect', () => {
      setReconnecting(false);
      setConnected(true);
      socket.emit('join-room', { slug });
    });

    socket.on('reconnect_failed', () => {
      setReconnecting(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [slug]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, connected, reconnecting, emit, on };
}
