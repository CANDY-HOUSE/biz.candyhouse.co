import { isAndroidShell } from './appBridge';

export const appBuildHash = process.env.REACT_APP_GIT_HASH || '';
export const appUpdateEnabled =
  process.env.NODE_ENV === 'production' &&
  isAndroidShell &&
  /^[0-9a-f]{8,40}$/.test(appBuildHash) &&
  new URLSearchParams(window.location.search).get('background') !== '1';
