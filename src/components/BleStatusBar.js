import { useSyncExternalStore } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { bleStatusText } from '@/services/blePresentation';
import { deviceService } from '@/services/deviceService';

export default function BleStatusBar({ deviceUUID, bluetoothOff }) {
  const devices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const device = devices[deviceUUID?.toUpperCase()];
  const { t } = useTranslation();
  const text = bleStatusText(device, bluetoothOff ?? device?.bluetoothOff, t);
  if (!text) return null;
  return (
    <Box
      role="status"
      sx={{
        bgcolor: '#993434',
        color: '#fff',
        minHeight: 53,
        boxSizing: 'border-box',
        width: '100%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        px: '17px',
        py: '8px',
        fontSize: 17,
      }}
    >
      {text}
    </Box>
  );
}
