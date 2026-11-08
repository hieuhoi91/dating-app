'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let socketPromise: Promise<Socket> | null = null;

async function requestSocketToken(): Promise<string> {
  let response = await fetch('/api/auth/socket-token', {
    method: 'POST',
    cache: 'no-store',
  });
  if (response.status === 401) {
    const refresh = await fetch('/api/auth/refresh', {
      method: 'POST',
      cache: 'no-store',
    });
    if (!refresh.ok) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    response = await fetch('/api/auth/socket-token', {
      method: 'POST',
      cache: 'no-store',
    });
  }
  if (!response.ok) {
    throw new Error('Không thể xác thực kết nối thời gian thực.');
  }
  const result = (await response.json()) as { accessToken?: string };
  if (!result.accessToken) {
    throw new Error('Máy chủ chưa cấp mã kết nối thời gian thực.');
  }
  return result.accessToken;
}

export async function getRealtimeSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (socketPromise) return socketPromise;

  socketPromise = (async () => {
    const apiUrl = process.env.NEXT_PUBLIC_NEST_API_URL;
    if (!apiUrl) {
      throw new Error('Thiếu cấu hình NEXT_PUBLIC_NEST_API_URL.');
    }
    const accessToken = await requestSocketToken();
    const connection = io(new URL('/realtime', apiUrl).toString(), {
      auth: { token: accessToken },
      autoConnect: false,
    });
    socket = connection;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => finish(() => reject(new Error('Kết nối thời gian thực đã hết hạn.'))),
        10_000,
      );
      const finish = (complete: () => void) => {
        window.clearTimeout(timeout);
        connection.off('realtime:ready', handleReady);
        connection.off('connect_error', handleError);
        connection.off('disconnect', handleDisconnect);
        complete();
      };
      const handleReady = () => finish(resolve);
      const handleError = (error: Error) => finish(() => reject(error));
      const handleDisconnect = () =>
        finish(() => reject(new Error('Máy chủ đã từ chối kết nối thời gian thực.')));
      connection.once('realtime:ready', handleReady);
      connection.once('connect_error', handleError);
      connection.once('disconnect', handleDisconnect);
      connection.connect();
    });
    return connection;
  })();

  try {
    return await socketPromise;
  } catch (error) {
    socket?.disconnect();
    socket = null;
    throw error;
  } finally {
    socketPromise = null;
  }
}
