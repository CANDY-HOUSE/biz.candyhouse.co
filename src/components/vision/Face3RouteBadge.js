import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

/**
 * 【临时调试】实时画面正上方显示当前媒体走中继 RELAY (TURN) 还是点对点 P2P。
 *
 * 上线后删除：删掉本文件，以及
 *   - Face3LiveView.js 里的 Face3RouteBadge import 和 <Face3RouteBadge .../> 一行
 *   - protocols/kvsViewer.js 返回值里的 getStats 一行
 *
 * 判断依据：getStats 里当前选中的 candidate-pair，任一端 candidateType 为 relay 即为中继，
 * 否则（host / srflx / prflx）为点对点。每 2 秒查一次，网络切换后会跟着变。
 * 只有 KVS 观看端提供 getStats；LiveKit 本身走 SFU 服务器转发，不显示。
 */

const POLL_MS = 2000;

const detectRoute = (report) => {
  const byId = new Map();
  report.forEach((r) => byId.set(r.id, r));
  let pair = null;
  /* 首选 transport.selectedCandidatePairId；拿不到再退回 nominated + succeeded 的那条 */
  report.forEach((r) => {
    if (!pair && r.type === 'transport' && r.selectedCandidatePairId) pair = byId.get(r.selectedCandidatePairId);
  });
  report.forEach((r) => {
    if (!pair && r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r;
  });
  if (!pair) return null;
  const local = byId.get(pair.localCandidateId);
  const remote = byId.get(pair.remoteCandidateId);
  return local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'relay' : 'p2p';
};

export default function Face3RouteBadge({ viewerRef, active }) {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (!active) {
      setRoute(null);
      return undefined;
    }
    let stopped = false;
    const check = async () => {
      try {
        const report = await viewerRef.current?.getStats?.();
        if (stopped || !report) return;
        const next = detectRoute(report);
        if (next) setRoute(next);
      } catch (_) {
        /* 调试用，查不到就不显示 */
      }
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [active, viewerRef]);

  if (!active || !route) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'rgba(0,0,0,0.55)',
        color: 'white',
        fontSize: 12,
        lineHeight: 1.5,
        pointerEvents: 'none',
      }}
    >
      {route === 'relay' ? 'RELAY' : 'P2P'}
    </Box>
  );
}
