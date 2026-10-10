// Log diagnostic identifiers only. Backend messages and Error objects can contain credentials or user data.
export function logOperationFailure(scope = 'unknown', reason = 'operationFailed') {
  const identifier = (value, fallback) =>
    typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_./-]{0,159}$/.test(value) ? value : fallback;
  console.warn('[Biz operation failed]', {
    scope: identifier(scope, 'unknown'),
    reason: identifier(reason, 'operationFailed'),
  });
}

export function createSnackbarNotifier(showSnackbar) {
  return (notification) => {
    if (notification?.severity === 'error') {
      if (notification.open) logOperationFailure(notification.logScope, notification.logReason);
      return;
    }
    showSnackbar(notification);
  };
}
