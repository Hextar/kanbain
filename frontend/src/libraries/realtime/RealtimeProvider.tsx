"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { applyRealtimeMessage, parseRealtimeMessage } from "./applyEvent";
import { realtimeClientId, wsUrl } from "./session";

const PING_MS = 20_000;
const BACKOFF_MAX_MS = 15_000;

type RealtimeContextValue = {
  connected: boolean;
  subscribe: (projectId: string) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  subscribe: () => () => {},
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const countsRef = useRef(new Map<string, number>());
  const clientIdRef = useRef(realtimeClientId());

  const send = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  }, []);

  const subscribe = useCallback(
    (projectId: string) => {
      const counts = countsRef.current;
      const next = (counts.get(projectId) ?? 0) + 1;
      counts.set(projectId, next);
      if (next === 1) send({ type: "subscribe", projectId });
      return () => {
        const remaining = (counts.get(projectId) ?? 1) - 1;
        if (remaining <= 0) {
          counts.delete(projectId);
          send({ type: "unsubscribe", projectId });
          return;
        }
        counts.set(projectId, remaining);
      };
    },
    [send],
  );

  useEffect(() => {
    const url = wsUrl();
    if (!url) return;
    const clientId = clientIdRef.current;
    let closed = false;
    let ping = 0;
    let reconnect = 0;
    let delay = 1000;

    function connect() {
      if (closed) return;
      const socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onopen = () => {
        delay = 1000;
        setConnected(true);
        for (const projectId of countsRef.current.keys()) {
          socket.send(JSON.stringify({ type: "subscribe", projectId }));
        }
        window.clearInterval(ping);
        ping = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_MS);
      };
      socket.onmessage = (incoming) => {
        const message = parseRealtimeMessage(incoming.data);
        if (!message) return;
        applyRealtimeMessage(queryClient, message, clientId);
      };
      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        window.clearInterval(ping);
        if (closed) return;
        reconnect = window.setTimeout(connect, delay);
        delay = Math.min(delay * 2, BACKOFF_MAX_MS);
      };
    }

    connect();
    return () => {
      closed = true;
      window.clearTimeout(reconnect);
      window.clearInterval(ping);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ connected, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function useRealtimeRooms(projectIds: readonly string[]) {
  const { subscribe } = useRealtime();
  const key = JSON.stringify(projectIds);
  useEffect(() => {
    const ids: string[] = JSON.parse(key);
    if (ids.length === 0) return;
    const stop = ids.map((id) => subscribe(id));
    return () => {
      for (const unsub of stop) unsub();
    };
  }, [key, subscribe]);
}

export function useRealtimeConnected() {
  return useRealtime().connected;
}
