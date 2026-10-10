import { useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, ButtonBase, IconButton, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { useAppLockSettings } from '@/hooks/useAppLockSettings';
import LockSettingWheel from './LockSettingWheel';
import LockCalibrationGraphic from './LockCalibrationGraphic';
import { lockSettingsInteraction } from './lockSettingsInteraction';
import BleStatusBar from './BleStatusBar';
import locked from '@/assets/lock-settings/locked.svg';
import unlocked from '@/assets/lock-settings/unlocked.svg';

const intervals = [0, 1000, 500, 300, 250, 200, 150, 100, 50];
export default function AppLockAngle() {
  const [params] = useSearchParams();
  return <LockAngle key={params.get('deviceUUID')} deviceUUID={params.get('deviceUUID') || ''} />;
}
function LockAngle({ deviceUUID }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gManageDevice } = useContext(GlobalStateContext);
  const { settings, connected, busy, error, command } = useAppLockSettings(deviceUUID);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [pendingModel, setPendingModel] = useState(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const hold = useRef(null);
  const longPressed = useRef(false);
  const wheel = useRef(null);
  useEffect(() => () => clearTimeout(hold.current), []);
  useEffect(() => {
    if (!connected) setFrequencyOpen(false);
  }, [connected]);
  useEffect(() => {
    if (frequencyOpen) wheel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [frequencyOpen]);
  const frequency = (ms) =>
    ms === 0 ? t('lockSettings.stopped') : t('lockSettings.hertz', { count: Math.round(1000 / ms) });
  const disabled = !connected || busy || syncing;
  const syncModel = async (model) => {
    setSyncing(true);
    try {
      const device = gManageDevice.companyDevices.find((d) => d.deviceUUID?.toUpperCase() === deviceUUID.toUpperCase());
      if (!device) throw new Error('Device unavailable');
      const updated = { ...device, deviceModel: model };
      await new Promise((resolve, reject) =>
        gManageDevice.addSesameDevicesToBiz3([updated], (res) =>
          res.success ? resolve() : reject(new Error('Sync failed'))
        )
      );
      gManageDevice.updateDeviceState(updated);
      setPendingModel(null);
      setSyncFailed(false);
    } catch (_) {
      setSyncFailed(true);
    } finally {
      setSyncing(false);
    }
  };
  const changeMode = async () => {
    if (![21, 32].includes(settings.productType)) return;
    const data = await command('slidingMode');
    if (data) {
      setPendingModel(data.deviceModel);
      await syncModel(data.deviceModel);
    }
  };
  const calibration = (operation, text, src) => (
    <ButtonBase
      disabled={disabled}
      onClick={() => command(operation)}
      sx={{
        width: '100%',
        minHeight: 60,
        bgcolor: '#fff',
        borderBottom: '1px solid #eee',
        position: 'relative',
        px: '55px',
        py: 1,
        fontSize: 20,
        color: '#111',
      }}
    >
      {src ? (
        <Box component="img" src={src} alt="" sx={{ position: 'absolute', left: '12%', width: 24, height: 24 }} />
      ) : (
        <Box sx={{ position: 'absolute', left: '15%', height: 30, borderLeft: '2px dashed #999' }} />
      )}
      <Box component="span" sx={{ ml: 2 }}>
        {text}
      </Box>
    </ButtonBase>
  );
  return (
    <Box
      sx={{
        ...lockSettingsInteraction,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#ededed',
        color: '#111',
      }}
    >
      <Box
        component="header"
        sx={{ height: 44, flexShrink: 0, position: 'relative', display: 'grid', placeItems: 'center', bgcolor: '#fff' }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          aria-label={t('lockSettings.back')}
          sx={{ position: 'absolute', left: 0, width: 44, height: 44, color: '#111' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </IconButton>
        <Typography sx={{ fontSize: 18, fontWeight: 'bold' }}>
          {t('pages.sesameAccessControlDevice.index.SetAngle')}
        </Typography>
      </Box>
      <BleStatusBar deviceUUID={deviceUUID} />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: '30px', overscrollBehavior: 'contain' }}>
        <Typography sx={{ mt: 2, textAlign: 'center', fontSize: 18, color: '#999' }}>
          {t('lockSettings.configure')}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <LockCalibrationGraphic
            settings={settings}
            disabled={disabled}
            onClick={() => command('toggle')}
            label={t('pages.sesameAccessControlDevice.index.SetAngle')}
          />
        </Box>
        <Typography sx={{ textAlign: 'center', fontSize: 18, color: '#999' }}>
          {Number.isFinite(settings.position) ? `${settings.position}°` : '—'}
        </Typography>
        <Typography
          sx={{
            mt: '30px',
            mb: '20px',
            px: 4,
            textAlign: 'center',
            color: '#999',
            fontSize: 14,
            whiteSpace: 'pre-line',
          }}
        >
          {t('lockSettings.instructions')}
        </Typography>
        {calibration('lockPosition', t('lockSettings.setLocked'), locked)}
        {calibration('unlockPosition', t('lockSettings.setUnlocked'), unlocked)}
        {settings.switchPoint !== undefined && calibration('switchPoint', t('lockSettings.switchPoint'))}
        {(error || syncFailed) && (
          <Alert severity="error">
            {t('lockSettings.failed')}
            {pendingModel && (
              <Button disabled={disabled} onClick={() => syncModel(pendingModel)}>
                {t('lockSettings.retry')}
              </Button>
            )}
          </Alert>
        )}
        <Box sx={{ height: 400 }} />
        {settings.sensorInterval !== undefined && (
          <>
            <ButtonBase
              disabled={disabled}
              onClick={() => setFrequencyOpen(!frequencyOpen)}
              sx={{ width: '100%', minHeight: 53, px: 2, justifyContent: 'space-between', bgcolor: '#fff', gap: 2 }}
            >
              <Typography>{t('lockSettings.frequency')}</Typography>
              <Typography sx={{ color: '#999' }}>{frequency(settings.sensorInterval)}</Typography>
            </ButtonBase>
            {frequencyOpen && (
              <Box ref={wheel}>
                <LockSettingWheel
                  title={t('lockSettings.frequency')}
                  values={intervals}
                  value={intervals.reduce((a, b) =>
                    Math.abs(b - settings.sensorInterval) < Math.abs(a - settings.sensorInterval) ? b : a
                  )}
                  label={frequency}
                  disabled={disabled}
                  onChange={async (value) => {
                    if (await command('sensorInterval', value)) setFrequencyOpen(false);
                  }}
                />
              </Box>
            )}
          </>
        )}
        {settings.magnet && (
          <ButtonBase
            disabled={disabled}
            onPointerDown={() => {
              longPressed.current = false;
              hold.current = setTimeout(() => {
                longPressed.current = true;
                changeMode();
              }, 700);
            }}
            onPointerUp={() => clearTimeout(hold.current)}
            onPointerCancel={() => clearTimeout(hold.current)}
            onPointerLeave={() => clearTimeout(hold.current)}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (!longPressed.current) command('magnet');
            }}
            sx={{
              width: '100%',
              minHeight: 53,
              bgcolor: '#fff',
              mt: '1px',
              fontSize: 17,
              fontWeight: 'bold',
              color: '#f44336',
              userSelect: 'none',
            }}
          >
            {t('lockSettings.magnet')}
          </ButtonBase>
        )}
      </Box>
    </Box>
  );
}
