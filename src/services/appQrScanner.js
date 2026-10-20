// One QR scan at a time; resolves with the text, null when cancelled, or rejects when the camera fails.
let pending = null;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export const appQrScanner = {
  open() {
    if (pending) return pending.promise;
    let settle;
    const promise = new Promise((resolve, reject) => {
      settle = { resolve, reject };
    });
    pending = { promise, ...settle };
    emit();
    return promise;
  },
  finish(value, error) {
    const current = pending;
    if (!current) return;
    pending = null;
    emit();
    error ? current.reject(error) : current.resolve(value ?? null);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => Boolean(pending),
};
