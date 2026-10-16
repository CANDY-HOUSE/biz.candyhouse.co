let sequence = Date.now();

/** Correlate replies so a late response cannot replace a newer page or recording. */
export function createEventRecordingRequests(send, action, timeoutMs = 15000) {
  const pending = new Map();
  const settle = (id, message) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.signal?.removeEventListener('abort', entry.cancel);
    entry.resolve(message);
  };
  return {
    request(op, fields, signal) {
      const requestId = ++sequence;
      return new Promise((resolve) => {
        const timer = setTimeout(() => settle(requestId, { success: false, message: 'timeout' }), timeoutMs);
        const cancel = () => settle(requestId, { success: false, message: 'cancelled' });
        pending.set(requestId, { resolve, timer, op, deviceId: fields.deviceId, signal, cancel });
        if (signal?.aborted) {
          cancel();
          return;
        }
        signal?.addEventListener('abort', cancel, { once: true });
        try {
          Promise.resolve(send({ action, op, ...fields, requestId })).catch(() =>
            settle(requestId, { success: false, message: 'network_error' })
          );
        } catch (err) {
          settle(requestId, { success: false, message: 'network_error' });
        }
      });
    },
    handle(message) {
      const entry = pending.get(message.requestId);
      if (!entry || message.action !== action || message.op !== entry.op) return;
      if (message.data?.deviceId && message.data.deviceId.toUpperCase() !== entry.deviceId) return;
      settle(message.requestId, message);
    },
    dispose() {
      [...pending.keys()].forEach((id) => settle(id, { success: false, message: 'cancelled' }));
    },
  };
}
