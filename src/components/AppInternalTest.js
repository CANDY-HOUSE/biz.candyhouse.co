import { useContext, useEffect, useRef, useState } from 'react';
import { Box, Button, Drawer, IconButton, Radio, Switch, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import useAppLayer from '@/hooks/useAppLayer';
import { onNativeEvent, requestNative } from '@/services/appBridge';
import { deviceService } from '@/services/deviceService';

// Internal tool: texts stay as in the former native sheet. Counter, selection and intervals persist per install.
const storeKey = 'sesame.internalTest';
const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || {};
  } catch (_) {
    return {};
  }
};
const writeStore = (value) => {
  try {
    localStorage.setItem(storeKey, JSON.stringify(value));
  } catch (_) {
    /* Preferences are a convenience; the test still runs without them. */
  }
};
const accent = '#28aeb1';
const sectionTitle = { color: '#333', fontSize: 15, fontWeight: 700 };
const grayButton = {
  minWidth: 0,
  bgcolor: '#d6d7d7',
  color: '#000',
  boxShadow: '0 2px 2px rgba(0,0,0,0.24)',
  '&:hover': { bgcolor: '#d6d7d7' },
  '&.Mui-disabled': { bgcolor: '#d6d7d7', color: '#000', opacity: 0.5 },
};

function InternalTestSheet({ onClose }) {
  const { gManageDevice } = useContext(GlobalStateContext);
  const [locks, setLocks] = useState([]);
  const [prefs, setPrefs] = useState(readStore);
  const [running, setRunning] = useState(false);
  const [firmwareDir, setFirmwareDir] = useState('prod');
  const [identifyId, setIdentifyId] = useState('');
  const [build, setBuild] = useState('Build: 加载中…');
  const session = useRef(0);
  const count = prefs.count || 0;
  const selected = locks.find((lock) => lock.deviceUUID === prefs.selectedId) || locks[0];
  const interval = (id) => Math.max(1, prefs.intervals?.[id] || 1);
  const name = (id) => {
    const device = gManageDevice.companyDevices.find((item) => item.deviceUUID?.toUpperCase() === id);
    return device?.deviceName || device?.deviceModel || id;
  };
  const save = (update) =>
    setPrefs((previous) => {
      const next = update(previous);
      writeStore(next);
      return next;
    });
  useEffect(() => {
    requestNative('internalTest', { operation: 'devices' })
      .then(({ data }) => setLocks(data || []))
      .catch(() => {});
    requestNative('internalTest', { operation: 'firmwareDir' })
      .then(({ data }) => setFirmwareDir(data.firmwareDir))
      .catch(() => {});
    requestNative('pushInfo')
      .then(({ data }) => setIdentifyId(data.appIdentifyId || ''))
      .catch(() => {});
    // Same source as the bottom-left build info bar.
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 6000);
    fetch(`${window.location.origin}/version.json`, { cache: 'no-store', signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((info) =>
        setBuild(`Build: ${info.buildTime || '--'} ${info.gitHash || '--'}\nVersion: ${info.version || '--'}`)
      )
      .catch((error) => setBuild(`Build: 获取失败 (${error.name || 'Error'})`))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, []);
  useEffect(() => {
    if (!running || !selected) return;
    const id = ++session.current;
    const device = selected;
    const record = () => {
      if (session.current === id) save((previous) => ({ ...previous, count: (previous.count || 0) + 1 }));
    };
    // Sesame 5 family counts lock state changes; Bot 2 family counts successful clicks.
    let last = deviceService.getSnapshot()[device.deviceUUID]?.bleState;
    const offState =
      device.action === 'toggle'
        ? deviceService.subscribe(() => {
            const state = deviceService.getSnapshot()[device.deviceUUID]?.bleState;
            if (session.current !== id || state === last) return;
            last = state;
            if (state === 'locked' || state === 'unlocked') record();
          })
        : () => {};
    let wakeLock;
    navigator.wakeLock
      ?.request('screen')
      .then((lock) => {
        if (session.current === id) wakeLock = lock;
        else lock.release();
      })
      .catch(() => {});
    let next = performance.now();
    let timer;
    const tick = () => {
      if (session.current !== id) return;
      next += interval(device.deviceUUID) * 1000;
      requestNative('internalTest', { operation: 'run', deviceUUID: device.deviceUUID })
        .then(() => device.action === 'click' && record())
        .catch(() => {});
      timer = setTimeout(tick, Math.max(0, next - performance.now()));
    };
    tick();
    // Unmounting with the sheet stops the loop, like the former dialog's dismiss.
    return () => {
      session.current++;
      clearTimeout(timer);
      offState();
      wakeLock?.release().catch(() => {});
    };
  }, [running]);
  useEffect(() => onNativeEvent(({ type }) => type === 'pause' && onClose()), [onClose]);
  const choose = (lock) => {
    if (running) return;
    save((previous) => ({
      ...previous,
      selectedId: lock.deviceUUID,
      count: selected?.deviceUUID === lock.deviceUUID ? previous.count : 0,
    }));
  };
  const step = (lock, delta) =>
    save((previous) => ({
      ...previous,
      intervals: { ...previous.intervals, [lock.deviceUUID]: Math.max(1, interval(lock.deviceUUID) + delta) },
    }));
  const reset = () => {
    if (running) return;
    save(() => ({ count: 0 }));
  };
  const changeFirmware = (checked) => {
    const value = checked ? 'prod' : 'dev';
    setFirmwareDir(value);
    requestNative('internalTest', { operation: 'firmwareDir', value })
      .then(({ data }) => setFirmwareDir(data.firmwareDir))
      .catch(() => {});
  };
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 2, pt: 1.5, pb: 3 }}>
      <Box sx={{ position: 'relative', pb: 1, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>内部测试</Typography>
        <IconButton
          aria-label="返回"
          disableRipple
          onClick={onClose}
          sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', p: 0.5, color: '#000' }}
        >
          <Close />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', userSelect: 'text' }}>
        <Typography sx={{ ...sectionTitle, pt: 0.5, pb: 1 }}>开关锁强度测试</Typography>
        <Typography sx={{ fontSize: 13, pb: 0.5, color: 'text.secondary' }}>
          {selected ? name(selected.deviceUUID) : '未选择'}, {selected ? interval(selected.deviceUUID) : 1}s toggle
        </Typography>
        <Typography sx={{ fontSize: 13, pb: 1.25, color: '#666' }}>开关锁次数: {count} 次</Typography>
        <Box sx={{ height: 280, overflowY: 'auto' }}>
          {locks.map((lock) => {
            const chosen = selected === lock;
            const editable = !running && chosen;
            return (
              <Box
                key={lock.deviceUUID}
                onClick={() => choose(lock)}
                sx={{ display: 'flex', alignItems: 'center', minHeight: 56, py: 1, opacity: running ? 0.6 : 1 }}
              >
                <Radio checked={chosen} disabled={running} sx={{ '&.Mui-checked': { color: '#00796b' } }} />
                <Typography sx={{ flex: 1, px: 1, fontSize: 14 }}>{name(lock.deviceUUID)}</Typography>
                <Button
                  disabled={!editable}
                  onClick={(event) => {
                    event.stopPropagation();
                    step(lock, -1);
                  }}
                  sx={{ ...grayButton, width: 36, height: 36, opacity: editable ? 1 : 0.3 }}
                >
                  -
                </Button>
                <Typography
                  sx={{ width: 56, textAlign: 'center', fontSize: 13, visibility: chosen ? 'visible' : 'hidden' }}
                >
                  {interval(lock.deviceUUID)}s
                </Typography>
                <Button
                  disabled={!editable}
                  onClick={(event) => {
                    event.stopPropagation();
                    step(lock, 1);
                  }}
                  sx={{ ...grayButton, width: 36, height: 36, opacity: editable ? 1 : 0.3 }}
                >
                  +
                </Button>
              </Box>
            );
          })}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1.5 }}>
          <Button disabled={running} onClick={reset} sx={{ ...grayButton, px: 2 }}>
            重置
          </Button>
          <Button disabled={running || !selected} onClick={() => setRunning(true)} sx={{ ...grayButton, px: 2 }}>
            开始
          </Button>
          <Button disabled={!running} onClick={() => setRunning(false)} sx={{ ...grayButton, px: 2 }}>
            停止
          </Button>
        </Box>
        <Typography sx={{ ...sectionTitle, mt: 3.5, pt: 3.5, pb: 1.5 }}>固件资源环境切换</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', pb: 2 }}>
          <Typography
            sx={{
              flex: 1,
              textAlign: 'right',
              fontSize: 14,
              color: '#666',
              opacity: firmwareDir === 'prod' ? 0.45 : 1,
            }}
          >
            dev
          </Typography>
          <Switch
            checked={firmwareDir === 'prod'}
            onChange={(event) => changeFirmware(event.target.checked)}
            sx={{
              mx: 2.5,
              // 88px track like the former native switch; the thumb travels the full track.
              width: 88 + 24,
              '& .MuiSwitch-switchBase.Mui-checked': { color: accent, transform: `translateX(${88 + 24 - 38}px)` },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#bfe8e9', opacity: 1 },
            }}
          />
          <Typography
            sx={{ flex: 1, textAlign: 'left', fontSize: 14, color: '#666', opacity: firmwareDir === 'prod' ? 1 : 0.45 }}
          >
            prod
          </Typography>
        </Box>
        <Typography sx={{ ...sectionTitle, mt: 3.5 }}>AppIdentifyId</Typography>
        <Typography sx={{ mt: 1, fontSize: 14, color: 'text.secondary', wordBreak: 'break-all' }}>
          {identifyId}
        </Typography>
        <Typography sx={{ ...sectionTitle, mt: 3.5 }}>Biz3</Typography>
        <Typography sx={{ mt: 1, fontSize: 14, lineHeight: 1.6, color: 'text.secondary', whiteSpace: 'pre-line' }}>
          {`Base URL: ${window.location.origin}\n${build}`}
        </Typography>
      </Box>
    </Box>
  );
}

/** Opened by a long press in the middle of the home header. */
export default function AppInternalTest() {
  const [open, setOpen] = useState(false);
  const close = useRef(() => setOpen(false)).current;
  useAppLayer(open, close);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('app-internal-test', show);
    return () => window.removeEventListener('app-internal-test', show);
  }, []);
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={close}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.35)' } } }}
      PaperProps={{ sx: { height: 'calc(100% - 40px)', borderRadius: '16px 16px 0 0' } }}
    >
      {open && <InternalTestSheet onClose={close} />}
    </Drawer>
  );
}
