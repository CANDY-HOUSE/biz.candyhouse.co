import { useEffect, useRef } from 'react';
import { openAppLayer } from '@/services/appNavigation';

/** While `open`, system back runs `close` instead of leaving the page. */
export default function useAppLayer(open, close) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!open) return;
    return openAppLayer(() => latest.current());
  }, [open]);
}
