import { useRef, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Close, Wifi, Wifi1Bar, Wifi2Bar } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { deviceService } from '@/services/deviceService';
import { lockSettingsInteraction } from './lockSettingsInteraction';

export default function AppHubWifi({ deviceUUID, onClose, connectAfterPassword = false }) {
  const { t } = useTranslation();
  const devices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const device = devices[deviceUUID.toUpperCase()];
  const networks = [...(device?.hub?.wifiScan || [])].sort((a, b) => b.rssi - a.rssi);
  const scanning = !!device?.hub?.wifiScanning;
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pull = useRef(null);
  const scanPending = useRef(false);
  const request = (operation, data = {}) => deviceService.request('hubSettings', { deviceUUID, operation, ...data });
  const scan = async () => {
    if (busy || scanning || scanPending.current || !device?.bleConnected) return;
    scanPending.current = true;
    setFailed(false);
    try {
      await request('scan', { refresh: true });
    } catch (_) {
      setFailed(true);
    } finally {
      scanPending.current = false;
    }
  };
  // The settings page owns scanning; this drawer subscribes and can explicitly refresh.
  return (
    <Drawer
      anchor="bottom"
      open
      onClose={() => !busy && onClose()}
      PaperProps={{ sx: { height: 'calc(100dvh - 8px)', borderRadius: '30px 30px 0 0', ...lockSettingsInteraction } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 50, px: 1 }}>
        <Box sx={{ width: 40 }} />
        <Typography sx={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 600 }}>
          {t('hubWifi.title')}
        </Typography>
        <IconButton disabled={busy} onClick={onClose} aria-label={t('hubWifi.close')}>
          <Close />
        </IconButton>
      </Box>
      {(failed || device?.hub?.wifiScanFailed) && <Alert severity="error">{t('lockSettings.failed')}</Alert>}
      {!device?.bleConnected && <Alert severity="info">{t('bleStatus.noSignal')}</Alert>}
      {(scanning || pullDistance > 0) && (
        <Box sx={{ textAlign: 'center', py: 1, transform: `translateY(${scanning ? 0 : pullDistance / 4}px)` }}>
          <CircularProgress
            size={24}
            aria-label={t('appHome.refreshing')}
            variant={scanning ? 'indeterminate' : 'determinate'}
            value={Math.min((pullDistance / 70) * 100, 100)}
          />
        </Box>
      )}
      <Box
        sx={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}
        onTouchStart={(e) => {
          setPullDistance(0);
          pull.current =
            !busy && !scanning && device?.bleConnected && e.currentTarget.scrollTop === 0 && e.touches.length === 1
              ? { x: e.touches[0].clientX, y: e.touches[0].clientY, distance: 0 }
              : null;
        }}
        onTouchMove={(e) => {
          if (!pull.current) return;
          const dy = e.touches[0].clientY - pull.current.y;
          const dx = Math.abs(e.touches[0].clientX - pull.current.x);
          if (e.touches.length !== 1 || dy < 0 || dx > Math.max(12, dy) || e.currentTarget.scrollTop > 0) {
            pull.current = null;
            setPullDistance(0);
            return;
          }
          pull.current.distance = Math.min(dy, 100);
          setPullDistance(pull.current.distance);
        }}
        onTouchCancel={() => {
          pull.current = null;
          setPullDistance(0);
        }}
        onTouchEnd={() => {
          if (pull.current?.distance >= 70) scan();
          pull.current = null;
          setPullDistance(0);
        }}
      >
        <List disablePadding>
          {networks.map(({ ssid, rssi }) => {
            const Signal = rssi > -50 ? Wifi : rssi > -70 ? Wifi2Bar : Wifi1Bar;
            return (
              <ListItemButton
                key={ssid}
                sx={{
                  height: 60,
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 16,
                    right: 0,
                    bottom: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                }}
                disabled={busy || !device?.bleConnected}
                onClick={async () => {
                  setBusy(true);
                  setFailed(false);
                  try {
                    await request('ssid', { ssid });
                    setSelected(ssid);
                    setPassword('');
                  } catch (_) {
                    setFailed(true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Signal sx={{ color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText primary={ssid} primaryTypographyProps={{ noWrap: true }} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
      <Typography sx={{ textAlign: 'center', p: 1, pb: 'max(8px, env(safe-area-inset-bottom))' }}>
        {t('hubWifi.refresh')}
      </Typography>
      <Dialog open={selected !== null} onClose={() => !busy && setSelected(null)}>
        <DialogTitle>{t('hubWifi.password')}</DialogTitle>
        <DialogContent>
          <Typography>{selected}</Typography>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            type="password"
            value={password}
            disabled={busy}
            label={t('pages.sesameAccessControlDevice.index.WiFiPWD')}
            onChange={(e) => setPassword(e.target.value)}
          />
          {failed && <Alert severity="error">{t('lockSettings.failed')}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>
            {t('deviceMember.opt.cancel')}
          </Button>
          <Button
            disabled={busy || !device?.bleConnected}
            onClick={async () => {
              setBusy(true);
              setFailed(false);
              try {
                await request('password', { password });
                if (connectAfterPassword) await request('connectWifi');
                onClose();
              } catch (_) {
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('deviceMember.opt.ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
