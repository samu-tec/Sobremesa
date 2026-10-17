interface Connection {
  connected: boolean;
  on(event: 'disconnect', listener: () => void): unknown;
  off(event: 'disconnect', listener: () => void): unknown;
}

/** A pending ACK belongs to one connection. Cancel it before a new connection can answer. */
export function requestOnConnection<T>(
  socket: Connection,
  send: (done: (result: T) => void) => void,
  messages: { offline: string; timeout: string },
  timeoutMs = 10000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error(messages.offline));
      return;
    }
    let settled = false;
    const cleanup = () => {
      settled = true;
      clearTimeout(timeout);
      socket.off('disconnect', disconnected);
    };
    const fail = (message: string) => {
      if (settled) return;
      cleanup();
      reject(new Error(message));
    };
    const disconnected = () => fail(messages.offline);
    const timeout = setTimeout(() => fail(messages.timeout), timeoutMs);
    socket.on('disconnect', disconnected);
    try {
      send((result) => {
        if (settled) return;
        cleanup();
        resolve(result);
      });
    } catch (error) {
      if (settled) return;
      cleanup();
      reject(error);
    }
  });
}
