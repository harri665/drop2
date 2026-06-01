import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Note } from '../types';

interface UseSocketOptions {
  onNoteCreated: (note: Note) => void;
  onNoteUpdated: (note: Note) => void;
  onNoteDeleted: (data: { id: string }) => void;
}

interface UseSocketReturn {
  online: boolean;
}

export function useSocket(options: UseSocketOptions): UseSocketReturn {
  const [online, setOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // In dev, connect directly to the backend to avoid Vite proxy duplicating
    // socket events during the polling→WebSocket transport upgrade handshake.
    const url = import.meta.env.DEV ? 'http://localhost:3000' : undefined;
    const socket = io(url!, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setOnline(true));
    socket.on('disconnect', () => setOnline(false));
    socket.on('connect_error', () => setOnline(false));

    socket.on('note:created', (note: Note) => {
      optionsRef.current.onNoteCreated(note);
    });
    socket.on('note:updated', (note: Note) => {
      optionsRef.current.onNoteUpdated(note);
    });
    socket.on('note:deleted', (data: { id: string }) => {
      optionsRef.current.onNoteDeleted(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { online };
}
