import { useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, ButtonBase, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { useAppLockSettings } from '@/hooks/useAppLockSettings';
import LockSettingWheel from './LockSettingWheel';
import LockCalibrationGraphic from './LockCalibrationGraphic';
import { lockSettingsInteraction } from './lockSettingsInteraction';
import BleStatusBar from './BleStatusBar';
import PageHeader from './PageHeader';
import locked from '@/assets/lock-settings/locked.svg';
import unlocked from '@/assets/lock-settings/unlocked.svg';
import { ios, hairline } from '@/theme/appHomeStyle';
import { groupCardSx, groupLabelSx, settingsHeaderSx } from './SettingsGroup';

const rowSx = {
  width: '100%',
  minHeight: 52,
  position: 'relative',
  justifyContent: 'flex-start',
  gap: '14px',
  px: '16px',
  py: '8px',
  fontSize: 17,
  color: ios.label,
  textAlign: 'left',
  '&:active': { bgcolor: ios.pressed },
  '&:not(:last-child)::after': {
    content: '""',
    position: 'absolute',
    left: 60,
    right: 0,
    bottom: 0,
    height: '1px',
    borderBottom: hairline,
  },
};
const groupSx = { ...groupCardSx, mx: '16px' };

const intervals = [0, 1000, 500, 300, 250, 200, 150, 100, 50];
export default function AppLockAngle() {
  const [params] = useSearchParams();
  return <LockAngle key={params.get('deviceUUID')} deviceUUID={params.get('deviceUUID') || ''} />;
}
export function LockAngle({ deviceUUID, onBack, embedded = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const { settings, connected, busy, error, readOnly, command } = useAppLockSettings(deviceUUID);
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
  // All entries stay visible; firmware without the capability answers with Coming soon.
  const coming = () => setSnackbarValue({ open: true, msg: 'Coming soon', severity: 'info' });
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
    if (isAppHome) deviceService.notify('haptic', { duration: 100 });
    const data = await command('slidingMode');
    if (data) {
      setPendingModel(data.deviceModel);
      await syncModel(data.deviceModel);
    }
  };
  const calibration = (operation, text, src, supported = true) => (
    <ButtonBase disabled={disabled} onClick={() => (supported ? command(operation) : coming())} sx={rowSx}>
      <Box sx={{ width: 30, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {src ? (
          <Box component="img" src={src} alt="" sx={{ width: 24, height: 24 }} />
        ) : (
          <Box sx={{ height: 28, borderLeft: '2px dashed #999' }} />
        )}
      </Box>
      <Box component="span">{text}</Box>
    </ButtonBase>
  );
  return (
    <Box
      sx={{
        ...lockSettingsInteraction,
        height: embedded ? '100%' : '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: ios.background,
        color: ios.label,
      }}
    >
      <PageHeader
        sx={{ ...settingsHeaderSx, ...(embedded && { px: 0 }) }}
        onBack={onBack ?? (() => navigate(-1))}
        title={t('pages.sesameAccessControlDevice.index.SetAngle')}
      />
      <BleStatusBar deviceUUID={deviceUUID} />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: '30px', overscrollBehavior: 'contain' }}>
        <Typography sx={{ mt: 2, px: 2, textAlign: 'center', fontSize: 17, color: ios.secondaryLabel }}>
          {t('lockSettings.configure')}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <LockCalibrationGraphic
            settings={settings}
            disabled={disabled}
            onClick={() => {
              if (isAppHome) deviceService.notify('haptic', { duration: 100 });
              command('toggle');
            }}
            label={t('pages.sesameAccessControlDevice.index.SetAngle')}
          />
        </Box>
        <Typography sx={{ mt: '-16px', textAlign: 'center', fontSize: 22, fontWeight: 600, color: ios.label }}>
          {Number.isFinite(settings.position) ? `${settings.position}°` : '—'}
        </Typography>
        <Typography
          sx={{
            mt: '24px',
            mb: '16px',
            px: 4,
            textAlign: 'center',
            color: ios.secondaryLabel,
            fontSize: 13,
            whiteSpace: 'pre-line',
          }}
        >
          {t('lockSettings.instructions')}
        </Typography>
        <Box sx={groupSx}>
          {calibration('lockPosition', t('lockSettings.setLocked'), locked)}
          {calibration('unlockPosition', t('lockSettings.setUnlocked'), unlocked)}
          {calibration('switchPoint', t('lockSettings.switchPoint'), null, settings.switchPoint !== undefined)}
        </Box>
        {(error || syncFailed) && (
          <Alert severity="error" sx={{ mx: '16px', mt: '12px', borderRadius: '12px' }}>
            {t('lockSettings.failed')}
            {pendingModel && (
              <Button disabled={disabled} onClick={() => syncModel(pendingModel)}>
                {t('lockSettings.retry')}
              </Button>
            )}
          </Alert>
        )}
        <Box sx={{ height: 400 }} />
        <Typography sx={{ ...groupLabelSx, mx: '16px', pb: '6px' }}>{t('lockSettings.frequencyHint')}</Typography>
        <Box sx={groupSx}>
          <ButtonBase
            disabled={disabled}
            onClick={() =>
              readOnly
                ? command('sensorInterval')
                : settings.sensorInterval !== undefined
                  ? setFrequencyOpen(!frequencyOpen)
                  : coming()
            }
            sx={{
              ...rowSx,
              justifyContent: 'space-between',
              gap: 2,
              '&:not(:last-child)::after': { ...rowSx['&:not(:last-child)::after'], left: 16 },
            }}
          >
            <Typography sx={{ fontSize: 17 }}>{t('lockSettings.frequency')}</Typography>
            <Typography sx={{ fontSize: 17, color: ios.secondaryLabel }}>
              {settings.sensorInterval !== undefined && frequency(settings.sensorInterval)}
            </Typography>
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
          <ButtonBase
            disabled={disabled}
            onPointerDown={() => {
              longPressed.current = false;
              if (!settings.magnet) return;
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
              if (!settings.magnet) coming();
              else if (!longPressed.current) command('magnet');
            }}
            sx={{
              ...rowSx,
              justifyContent: 'center',
              color: ios.red,
              userSelect: 'none',
            }}
          >
            {t('lockSettings.magnet')}
          </ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}
