import React, { useEffect, useState, memo } from 'react';
import { Box, Stack, Typography } from '@mui/material';

let versionInfo = null;

const BuildInfoBar = () => {
  const [info, setInfo] = useState(versionInfo || { buildTime: '--', gitHash: '--' });

  useEffect(() => {
    const live = process.env.NODE_ENV === 'development';
    if (versionInfo && !live) {
      setInfo(versionInfo);
      return;
    }

    let cancelled = false;
    let pending = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (cancelled || pending || (live && document.hidden)) return;
      pending = true;
      try {
        const res = await fetch('/version.json', { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return;
        const buildInfo = {
          buildTime: data.buildTime || '--',
          gitHash: data.gitHash || '--',
        };
        versionInfo = buildInfo;
        setInfo((previous) =>
          previous.buildTime === buildInfo.buildTime && previous.gitHash === buildInfo.gitHash ? previous : buildInfo
        );
      } catch {
        // 暂时断网或卸载取消请求时保留上次标识，开发模式下一轮会重试。
      } finally {
        pending = false;
      }
    };
    refresh();
    let timer;
    if (live) {
      timer = setInterval(refresh, 2000);
      window.addEventListener('focus', refresh);
      document.addEventListener('visibilitychange', refresh);
    }
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
    <Box
      sx={{
        flex: 'none',
        px: 2,
        py: 1.5,
        bgcolor: 'transparent',
        border: 'none',
        borderRadius: 0,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 'clamp(0.7rem, 1.2vw, 0.75rem)',
              color: 'rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {info.buildTime} {info.gitHash}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default memo(BuildInfoBar);
