import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  ListItem,
  ListItemButton,
  ListItemText,
  Switch,
  Typography,
  SvgIcon,
  Box,
} from '@mui/material';
import { SvgArrow } from '@/assets/svg/svgLock';
import { lockSettingsInteraction } from './lockSettingsInteraction';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppLockSettings } from '@/hooks/useAppLockSettings';
import LockSettingWheel from './LockSettingWheel';

const seconds = [0, 3, 5, 7, 10, 15, 30, 60, 120, 180, 240, 300, 600, 900, 1800, 3600];
const sensorSeconds = [65535, 0, 1, 2, 3, 4, ...seconds.slice(2)];

export default function AppLockSettings({ deviceUUID }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, connected, busy, error, readFailed, retryRead, command } = useAppLockSettings(deviceUUID);
  const [sensorOpen, setSensorOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  useEffect(() => {
    if (!connected) {
      setSensorOpen(false);
      setAutoOpen(false);
      setEnabling(false);
    }
  }, [connected]);
  const duration = (value) =>
    value === 65535
      ? t('lockSettings.immediate')
      : value === 0
        ? t('lockSettings.off')
        : value >= 3600
          ? t('lockSettings.hours', { count: value / 3600 })
          : value >= 60
            ? t('lockSettings.minutes', { count: value / 60 })
            : t('lockSettings.seconds', { count: value });
  const choose = async (operation, value) => {
    if (await command(operation, value)) {
      if (operation === 'sensorLock') setSensorOpen(false);
      else {
        setAutoOpen(false);
        setEnabling(false);
      }
    }
  };
  const autoEnabled = enabling || settings.autoLockSeconds > 0;
  return (
    <Box sx={lockSettingsInteraction}>
      {error && <Alert severity="error">{t('lockSettings.failed')}</Alert>}
      <ListItemButton onClick={() => navigate({ pathname: '/device-setting/angle', search: location.search })}>
        <ListItemText primary={t('pages.sesameAccessControlDevice.index.SetAngle')} />
        <SvgIcon component={SvgArrow} />
      </ListItemButton>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
      {settings.magnet && (
        <>
          <ListItemButton
            aria-disabled={!connected || busy || settings.sensorLockSeconds === undefined}
            onClick={() => {
              if (connected && !busy && settings.sensorLockSeconds !== undefined) setSensorOpen(!sensorOpen);
            }}
          >
            <ListItemText primary={t('pages.sesameAccessControlDevice.index.LockWithOpenSensor')} />
            <Typography sx={{ color: '#999' }}>
              {settings.sensorLockSeconds === undefined ? '—' : duration(settings.sensorLockSeconds)}
            </Typography>
          </ListItemButton>
          {sensorOpen && (
            <LockSettingWheel
              title={t('pages.sesameAccessControlDevice.index.LockWithOpenSensor')}
              values={sensorSeconds}
              value={settings.sensorLockSeconds}
              label={duration}
              disabled={busy || !connected}
              onChange={(value) => choose('sensorLock', value)}
            />
          )}
          <Divider variant="middle" sx={{ opacity: 0.4 }} />
        </>
      )}
      <ListItem>
        <ListItemText primary={t('pages.sesameAccessControlDevice.index.AutoLockCountdown')} />
        {readFailed && settings.autoLockSeconds === undefined && (
          <Button onClick={retryRead}>{t('lockSettings.retry')}</Button>
        )}
        {settings.autoLockSeconds > 0 && (
          <Button
            disabled={!connected || busy}
            sx={{ color: '#999', minWidth: 0 }}
            onClick={() => setAutoOpen(!autoOpen)}
          >
            {duration(settings.autoLockSeconds)}
          </Button>
        )}
        <Switch
          checked={autoEnabled}
          disabled={!connected || busy || settings.autoLockSeconds === undefined}
          inputProps={{ 'aria-label': t('pages.sesameAccessControlDevice.index.AutoLockCountdown') }}
          onChange={(_, checked) => {
            if (checked) {
              setEnabling(true);
              setAutoOpen(true);
            } else if (settings.autoLockSeconds > 0) choose('autoLock', 0);
            else {
              setAutoOpen(false);
              setEnabling(false);
            }
          }}
        />
      </ListItem>
      {autoOpen && (
        <LockSettingWheel
          title={t('pages.sesameAccessControlDevice.index.AutoLockCountdown')}
          values={seconds}
          value={settings.autoLockSeconds ?? 0}
          label={duration}
          disabled={busy || !connected}
          onChange={(value) => choose('autoLock', value)}
        />
      )}
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
    </Box>
  );
}
