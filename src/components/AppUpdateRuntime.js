import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { appUpdate, applyAppUpdate, watchAppUpdate } from '@/services/appUpdate';

export default function AppUpdateRuntime() {
  const { pathname } = useLocation();
  const version = useSyncExternalStore(appUpdate.subscribe, appUpdate.getSnapshot);
  useEffect(() => {
    const watcher = watchAppUpdate();
    return () => watcher.dispose();
  }, []);
  useEffect(() => {
    applyAppUpdate(pathname);
  }, [pathname, version]);
  return null;
}
