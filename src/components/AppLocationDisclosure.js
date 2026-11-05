import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { onNativeEvent, requestNative } from '@/services/appBridge';

// Store review requires this prominent disclosure before the first location prompt; the system prompt stays native.
export default function AppLocationDisclosure() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(
    () =>
      onNativeEvent(({ type }) => {
        if (type === 'locationDisclosure') setOpen(true);
      }),
    []
  );

  const answer = (accepted) => {
    setOpen(false);
    requestNative('locationDisclosure', { accepted }).catch(() => {});
  };

  return (
    <Dialog open={open}>
      <DialogTitle sx={{ color: '#000', fontWeight: 'bold', fontSize: 20 }}>
        {t('locationDisclosure.title')}
      </DialogTitle>
      <DialogContent>
        <Typography>{t('locationDisclosure.message')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => answer(false)}>{t('deviceMember.opt.cancel')}</Button>
        <Button onClick={() => answer(true)}>{t('locationDisclosure.continue')}</Button>
      </DialogActions>
    </Dialog>
  );
}
