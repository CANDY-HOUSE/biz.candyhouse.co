import { Snackbar } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { isGuestAppSession } from '@/services/appSession';

export default function AppGuestGate({ children }) {
  const { gStripe } = useContext(GlobalStateContext);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const guest = isGuestAppSession() || gStripe.customerInfo.isAnonymous !== false;
  useEffect(() => setOpen(guest), [guest, pathname]);
  return guest ? (
    <Snackbar
      key={pathname}
      open={open}
      onClose={() => setOpen(false)}
      autoHideDuration={2000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: { xs: 72, sm: 72 },
        left: { xs: '50%', sm: '50%' },
        right: 'auto',
        transform: 'translateX(-50%)',
        '& .MuiSnackbarContent-root': {
          minWidth: 'unset',
          flexGrow: 0,
          borderRadius: '20px',
          px: 2,
          py: 0.5,
          whiteSpace: 'nowrap',
        },
      }}
      message={t('appHome.loginRequired')}
    />
  ) : (
    children
  );
}
