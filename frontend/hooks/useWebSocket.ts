// hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    try {
      const socket = io(url, {
        transports: ['websocket'],
        auth: {
          token: localStorage.getItem('access_token') || '',
        },
      });

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        onConnect?.();
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        onDisconnect?.();
      });

      socket.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      });

      socket.on('message', (data: any) => {
        setLastMessage(data);
        onMessage?.(data);
      });

      // Handle specific events
      socket.on('order_updated', (data: any) => {
        console.log('Order updated:', data);
        // You can add toast notifications or state updates here
      });

      socket.on('vendor_approved', (data: any) => {
        console.log('Vendor approved:', data);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [url, isAuthenticated, user, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback(
    (event: string, data: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      } else {
        console.warn('WebSocket not connected, cannot send message');
      }
    },
    []
  );

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    socket: socketRef.current,
  };
}