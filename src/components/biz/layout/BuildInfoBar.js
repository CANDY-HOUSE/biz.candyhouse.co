import React, { useEffect, useState, memo } from 'react';
import { Box, Stack, Typography } from '@mui/material';

let versionInfo = null;

const BuildInfoBar = () => {
  const [info, setInfo] = useState(versionInfo || { buildTime: '--', gitHash: '--' });

  useEffect(() => {
    let cancelled = false;
    if (versionInfo) {
      setInfo(versionInfo);
      return;
    }

    fetch('/version.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const buildInfo = {
          buildTime: data.buildTime || '--',
          gitHash: data.gitHash || '--',
        };
        setInfo(buildInfo);
        versionInfo = buildInfo;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
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
