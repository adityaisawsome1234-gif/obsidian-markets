import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";
    socket = io(wsUrl, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function subscribeToTicker(ticker: string): void {
  const s = getSocket();
  s.emit("subscribe", { channel: "quotes", ticker });
}

export function unsubscribeFromTicker(ticker: string): void {
  const s = getSocket();
  s.emit("unsubscribe", { channel: "quotes", ticker });
}

export function subscribeToOptionsFlow(): void {
  const s = getSocket();
  s.emit("subscribe", { channel: "options_flow" });
}
