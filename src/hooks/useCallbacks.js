import { useCallback, useRef } from 'react';

export const useCallbacks = () => {
  const callbacksRef = useRef({});

  const registerCallback = useCallback((action, op, callback) => {
    if (typeof callback !== 'function') return;
    if (!callbacksRef.current[action]) {
      callbacksRef.current[action] = {};
    }
    if (!callbacksRef.current[action][op]) {
      callbacksRef.current[action][op] = [];
    }
    callbacksRef.current[action][op].push(callback);
  }, []);

  const invokeCallbacks = useCallback((response) => {
    try {
      const { action, op } = response;
      const callbacks = callbacksRef.current[action]?.[op];
      if (Array.isArray(callbacks)) {
        const currentCallbacks = [...callbacks];
        callbacks.length = 0;
        currentCallbacks.forEach((cb) => {
          cb(response);
        });
      }
    } catch (error) {
      console.error('Error invoking callbacks:', error);
    }
  }, []);

  return { registerCallback, invokeCallbacks };
};
