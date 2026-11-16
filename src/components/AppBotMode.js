import { Alert, Box, Divider, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppLockSettings } from '@/hooks/useAppLockSettings';
import { lockSettingsInteraction } from './lockSettingsInteraction';

const modes = ['normal', 'circle', 'longPress'];

// Bot 1 only; shells that predate the mode setting never report botMode, so the row stays hidden.
export default function AppBotMode({ deviceUUID }) {
  const { t } = useTranslation();
  const { settings, connected, busy, error, command } = useAppLockSettings(deviceUUID);
  if (settings.botMode === undefined) return null;
  const disabled = !connected || busy;
  return (
    <Box sx={lockSettingsInteraction}>
      {error && <Alert severity="error">{t('lockSettings.failed')}</Alert>}
      <ListItemButton
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) command('botMode', modes[(modes.indexOf(settings.botMode) + 1) % modes.length]);
        }}
      >
        <ListItemText primary={t('botSettings.mode')} />
        <Typography sx={{ color: '#999' }}>{t(`botSettings.modes.${settings.botMode}`)}</Typography>
      </ListItemButton>
      <Divider variant="middle" sx={{ opacity: 0.4 }} />
    </Box>
  );
}
