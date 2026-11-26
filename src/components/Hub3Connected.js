import { Box, List, ListItem, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MobileBindDevice from './MobileBindDevice';
import MobileHub3RemoteList from './MobileHub3RemoteList';

// Locks bound to the Hub3 and its IR remotes.
export default function Hub3Connected({ device, did }) {
  const { t } = useTranslation();
  return (
    <List>
      <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
        <Typography color="info.light" sx={{ lineHeight: '30px' }}>
          {t('pages.sesameAccessControlDevice.index.BindDeviceToHub3Hint', { deviceName: 'Hub3' })}
        </Typography>
      </Box>
      <ListItem sx={{ py: 0 }}>
        <MobileBindDevice device={device} />
      </ListItem>
      <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
        <Typography color="info.light" sx={{ lineHeight: '30px' }}>
          {t('pages.sesameAccessControlDevice.index.BindIRToHub3Hint')}
        </Typography>
      </Box>
      <ListItem sx={{ py: 0 }}>
        <MobileHub3RemoteList deviceUUID={did} />
      </ListItem>
    </List>
  );
}
