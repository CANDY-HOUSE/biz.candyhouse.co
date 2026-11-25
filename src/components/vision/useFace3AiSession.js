import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { biz3utils } from '@/utils/biz3utils';

const POLL_INTERVAL_MS = 4000;
// 启动中、停止中按 1 秒查询，开关尽快落到最终状态。
const TRANSITION_POLL_MS = 1000;
const EMPTY = {};

export const isFace3AiActive = (session) => Boolean(session && session.state !== 'ENDED');
const isTransitional = (session) => session?.state === 'PREPARING' || session?.state === 'STOPPING';

export function useFace3AiSession({ accountId, panelDeviceId, liveDeviceId, request, wake, onError }) {
  const scope = useMemo(() => ({ pending: new Set(), revision: new Map(), startIds: new Map() }), [accountId]);
  const currentScope = useRef(null);
  currentScope.current = scope;
  const [view, setView] = useState(null);
  const sessions = view?.scope === scope ? view.sessions : EMPTY;
  const pending = view?.scope === scope ? view.pending : EMPTY;

  const update = useCallback(
    (deviceId, changes) => {
      if (currentScope.current !== scope) return;
      setView((previous) => {
        const current = previous?.scope === scope ? previous : { scope, sessions: EMPTY, pending: EMPTY };
        if ('session' in changes) {
          const before = current.sessions[deviceId];
          const after = changes.session;
          if (
            before === after ||
            (before &&
              after &&
              before.sessionId === after.sessionId &&
              before.state === after.state &&
              before.reason === after.reason)
          ) {
            return current;
          }
          return { ...current, sessions: { ...current.sessions, [deviceId]: after } };
        }
        return { ...current, pending: { ...current.pending, [deviceId]: changes.pending } };
      });
    },
    [scope]
  );

  useEffect(() => {
    const lifetime = new AbortController();
    scope.lifetime = lifetime;
    return () => lifetime.abort();
  }, [scope]);

  useEffect(() => {
    const devices = [...new Set([panelDeviceId, liveDeviceId].filter(Boolean))];
    if (!accountId || devices.length === 0) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    let timer;
    let running = false;
    let soon = false;
    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(sync, ms);
    };
    const sync = async () => {
      running = true;
      soon = false;
      let transitional = false;
      await Promise.all(
        devices.map(async (deviceId) => {
          if (scope.pending.has(deviceId)) return;
          const revision = scope.revision.get(deviceId);
          const response = await request(deviceId, 'status', {}, signal);
          if (!signal.aborted && response.success && revision === scope.revision.get(deviceId)) {
            if (isTransitional(response.data.session)) transitional = true;
            update(deviceId, { session: response.data.session });
          }
        })
      );
      running = false;
      if (!signal.aborted) schedule(transitional || soon ? TRANSITION_POLL_MS : POLL_INTERVAL_MS);
    };
    // 启停请求返回过渡状态后提前下一次查询；查询进行中则让它结束后按短间隔续上，避免并行两条轮询。
    const pollSoon = () => {
      if (signal.aborted) return;
      if (running) soon = true;
      else schedule(TRANSITION_POLL_MS);
    };
    scope.pollSoon = pollSoon;
    sync();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (scope.pollSoon === pollSoon) scope.pollSoon = undefined;
    };
  }, [accountId, liveDeviceId, panelDeviceId, request, scope, update]);

  const toggle = useCallback(
    async (deviceId, prepareForStart) => {
      const signal = scope.lifetime?.signal;
      if (!accountId || !signal || signal.aborted || scope.pending.has(deviceId)) return;
      const cancelled = () => signal.aborted || currentScope.current !== scope;
      const expected = sessions[deviceId];
      scope.pending.add(deviceId);
      scope.revision.set(deviceId, (scope.revision.get(deviceId) || 0) + 1);
      update(deviceId, { pending: true });
      let resume;
      try {
        const status = await request(deviceId, 'status', {}, signal);
        if (cancelled()) return;
        if (!status.success) {
          onError(status.message);
          return;
        }
        const current = status.data.session;
        update(deviceId, { session: current });

        let result;
        if (isFace3AiActive(current)) {
          scope.startIds.delete(deviceId);
          // A different session appeared after this switch was drawn. Reflect it and wait for a new click.
          if (current.sessionId !== expected?.sessionId || current.state === 'STOPPING') return;
          result = await request(deviceId, 'stop', { sessionId: current.sessionId }, signal);
        } else if (!isFace3AiActive(expected)) {
          resume = prepareForStart();
          const awakened = await wake(deviceId, signal);
          if (cancelled()) return;
          if (!awakened.success) {
            onError(awakened.message);
            return;
          }

          const requestId = scope.startIds.get(deviceId) || biz3utils.generateUUID();
          scope.startIds.set(deviceId, requestId);
          result = await request(deviceId, 'start', { requestId }, signal);
          // Keep the same idempotency key when the response was lost.
          if (result.code && result.code < 500) scope.startIds.delete(deviceId);
        }
        if (cancelled() || !result) return;
        if (result.success) {
          update(deviceId, { session: result.data.session });
          if (isTransitional(result.data.session)) scope.pollSoon?.();
        } else onError(result.message);
      } catch (error) {
        if (!cancelled()) onError(error.message);
      } finally {
        resume?.();
        scope.pending.delete(deviceId);
        update(deviceId, { pending: false });
      }
    },
    [accountId, onError, request, scope, sessions, update, wake]
  );

  return { sessions, pending, toggle };
}
