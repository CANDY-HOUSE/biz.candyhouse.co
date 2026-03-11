import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Box, Divider, List, ListItem, ListItemText, Switch, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils';

const MobileDeviceNotifyCenter = () => {
  const { gManageDevice } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const pushToken = searchParams.get('pushToken');
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    gManageDevice.getDevicesNotifyStatus({ pushToken }, (res) => {
      if (!res.success) {
        return;
      }
      setDevices(res.data);
    });
  }, []);

  const handleEnablePush = useCallback(({ pushToken, deviceUUID, enablePush }) => {
    gManageDevice.switchDeviceNotify({ pushToken, deviceUUID, enablePush }, (res) => {
      if (!res.success) {
        return;
      }
      setDevices((preState) => {
        return preState.map((device) =>
          device.deviceUUID === deviceUUID ? { ...device, enablePush: enablePush } : device
        );
      });
    });
  });

  const handleOpenSystemNotificationSettings = useCallback(() => {
    biz3utils.triggerBridge({
      action: 'requestNotificationSettings',
    });
  }, []);

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <List disablePadding>
        {devices.length > 0 && (
          <Box sx={{ bgcolor: 'secondary.light', p: 2 }}>
            <Typography
              onClick={handleOpenSystemNotificationSettings}
              sx={{
                fontWeight: 'bold',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {t('pages.sesameAccessControlDevice.index.NotifyCenterHint')}
            </Typography>
          </Box>
        )}
        {devices.map((device, index) => (
          <React.Fragment key={device.deviceUUID}>
            <ListItem>
              <ListItemText primary={device.deviceName} sx={{ flex: 1 }} />
              <Switch
                edge="end"
                checked={device.enablePush}
                onChange={(event) => {
                  handleEnablePush({ pushToken, deviceUUID: device.deviceUUID, enablePush: event.target.checked });
                }}
              />
            </ListItem>
            {index < devices.length - 1 && <Divider light variant="middle" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default MobileDeviceNotifyCenter;
