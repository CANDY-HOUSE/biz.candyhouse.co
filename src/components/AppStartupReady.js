import { useLayoutEffect } from 'react';
import { isAndroidShell, requestNative } from '@/services/appBridge';

const foreground = isAndroidShell && new URLSearchParams(window.location.search).get('background') !== '1';

export default function AppStartupReady() {
  useLayoutEffect(() => {
    if (!foreground) return;
    // Mount beside AppBootstrap: neither login nor the online device list gates this signal.
    // Queue until the existing trusted Bridge is connected. Android confirms the visual state.
    requestNative('uiReady').catch(() => {});
  }, []);
  return null;
}
