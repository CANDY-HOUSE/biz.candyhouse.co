import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { isGuestAppSession } from '@/services/appSession';

export default function AppGuestGate({ children }) {
  const { gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const guest = isGuestAppSession() || gStripe.customerInfo.isAnonymous !== false;
  useEffect(() => {
    if (guest) setSnackbarValue({ open: true, severity: 'info', msg: t('appHome.loginRequired') });
  }, [guest, pathname, setSnackbarValue, t]);
  return guest ? null : children;
}
