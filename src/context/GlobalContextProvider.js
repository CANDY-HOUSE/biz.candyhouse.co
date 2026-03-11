import React, { useState } from 'react';

import { useAuthState } from '../api/useAuthState';
import { useStripeInfo } from '../api/useStripeInfo';
import { useManageEmployee } from '../api/useManageEmployee';
import GSnackbar from '@/components/SnackBar';
import CustomModal from '@/components/biz/CustomModal';
import { useIotCtrl } from '../api/useIotCtrl.js';
import { useManageDevice } from '../api/useManageDevice';
import WebSocketManager from '../websocket/WebSocketManager.ts';
import useManageGroup from '../api/useManageGroup.js';
import { useDeveloper } from '../api/useDeveloper.js';
import { useManageAuthData } from '../api/useManageAuthData.js';
import { useMediaType } from '@hooks/useMediaType.js';
import { ThemeProvider } from '@mui/material';
import theme from '@/theme/theme';

export const GlobalStateContext = React.createContext({});
const GlobalContextProvider = ({ children, location }) => {
  const gMediaType = useMediaType();
  const [gSnackbarValue, setSnackbarValue] = useState({ open: false, msg: '' });
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customModalKeep, setCustomModalKeep] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const gAuth = useAuthState();
  const gStripe = useStripeInfo(gAuth);
  const gManageDevice = useManageDevice(gAuth, gStripe, setSnackbarValue);
  const gManageAuthData = useManageAuthData(gManageDevice, gStripe);
  const gManageEmployee = useManageEmployee(gAuth, gStripe, setSnackbarValue);
  const gManageGroup = useManageGroup(gStripe);
  const gDeveloper = useDeveloper(gStripe, gAuth);
  const gIot = useIotCtrl(gAuth, gStripe, gManageDevice);
  return (
    <GlobalStateContext.Provider
      value={{
        gWebSocket: WebSocketManager, // 直接使用WebSocket单例
        gAuth,
        setSnackbarValue,
        gStripe,
        location,
        gManageEmployee,
        gManageGroup,
        gIot,
        gManageDevice,
        gMediaType,
        customModalOpen,
        setCustomModalKeep,
        setCustomModalOpen,
        modalContent,
        setModalContent,
        modalTitle,
        setModalTitle,
        gDeveloper,
        gManageAuthData,
      }}
    >
      {children}
      <GSnackbar value={gSnackbarValue} />
      <CustomModal
        open={customModalOpen}
        onClose={(event, reason) => {
          if (reason === 'backdropClick' && customModalKeep) {
            return;
          }
          setCustomModalOpen(false);
        }}
      >
        <ThemeProvider theme={theme}>{modalContent}</ThemeProvider>
      </CustomModal>
    </GlobalStateContext.Provider>
  );
};
export default GlobalContextProvider;
