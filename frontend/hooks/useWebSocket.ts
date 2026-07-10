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
  onReconnect?: (attempt: number) => void;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const { user, isAuthenticated, isAuthenticated: isAuthReady } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isConnectingRef = useRef(false);

  // ✅ Get token from cookies
  const getToken = useCallback(() => {
    if (typeof document === 'undefined') return null;
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='));
    return cookie ? cookie.split('=')[1] : null;
  }, []);

  // ✅ Connect WebSocket with token
  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (isConnectingRef.current) return;
    if (socketRef.current?.connected) return;

    const token = getToken();
    if (!token) {
      console.log('ℹ️ WebSocket: No token found, skipping connection');
      return;
    }

    isConnectingRef.current = true;

    try {
      console.log(`🔌 WebSocket: Connecting to ${url}...`);
      
      const socket = io(url, {
        transports: ['websocket'],
        auth: { token },
        reconnection: false,
        timeout: 10000,
        autoConnect: true,
      });

      socket.on('connect', () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        console.log('✅ WebSocket connected');
        onConnect?.();
      });

      socket.on('disconnect', (reason) => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        isConnectingRef.current = false;
        console.log(`❌ WebSocket disconnected: ${reason}`);
        onDisconnect?.();
        
        // ✅ Only attempt reconnection for specific reasons
        if (['io server disconnect', 'transport close', 'transport error'].includes(reason)) {
          attemptReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        isConnectingRef.current = false;
        setConnectionError(error.message);
        console.error('WebSocket connection error:', error.message);
        onError?.(error);
      });

      socket.on('message', (data: any) => {
        if (!mountedRef.current) return;
        setLastMessage(data);
        onMessage?.(data);
      });

      // ✅ Handle specific events
      socket.on('notification', (data: any) => {
        onMessage?.({ event: 'notification', data });
      });

      socket.on('order_updated', (data: any) => {
        onMessage?.({ event: 'order_updated', data });
      });

      socket.on('vendor_approved', (data: any) => {
        onMessage?.({ event: 'vendor_approved', data });
      });

      socketRef.current = socket;
    } catch (error) {
      isConnectingRef.current = false;
      console.error('Failed to connect WebSocket:', error);
      onError?.(error as Error);
    }
  }, [url, getToken, onConnect, onDisconnect, onError, onMessage]);

  // ✅ Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('⚠️ WebSocket: Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 30000);
    reconnectAttempts.current++;
    
    console.log(`🔄 WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
    onReconnect?.(reconnectAttempts.current);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect, maxReconnectAttempts, onReconnect]);

  // ✅ Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, []);

  // ✅ Send message
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('WebSocket not connected, cannot send message');
    return false;
  }, []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  // ✅ Auto-connect when authenticated
  useEffect(() => {
    if (!isAuthReady) return;

    if (autoConnect && isAuthenticated) {
      connect();
    } else if (!isAuthenticated) {
      disconnect();
    }
  }, [autoConnect, isAuthenticated, isAuthReady, connect, disconnect]);

  // ✅ Reconnect when token changes (login/logout)
  useEffect(() => {
    if (isAuthenticated && autoConnect) {
      // Check if token changed
      const token = getToken();
      if (token && socketRef.current) {
        // Optional: reconnect if needed
      }
    }
  }, [isAuthenticated, autoConnect, getToken]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    reconnectAttempts: reconnectAttempts.current,
    connect,
    disconnect,
    sendMessage,
    socket: socketRef.current,
  };
}