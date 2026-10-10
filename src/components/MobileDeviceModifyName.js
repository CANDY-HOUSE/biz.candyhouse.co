import BackButton from '@/components/BackButton';
import { isAppHome } from '@/services/deviceService';
import React, { useContext } from 'react';
import EditableText from './EditableText';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils';

const MobileDeviceModifyName = () => {
  const DeviceMemberChangedName = 'DeviceMemberChanged';
  const { gManageDevice, gStripe } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  const deviceUUID = searchParams.get('deviceUUID');
  const deviceName = searchParams.get('deviceName') || '';
  const isBridgingType = searchParams.get('notifyType') === 'bridge';
  const { t } = useTranslation();
  const navigate = useNavigate();

  const notifyRefreshApp = () => {
    if (!!isBridgingType) {
      biz3utils.triggerBridge({
        action: 'requestRefreshApp',
      });
      return;
    }
    const scheme = `ssm://UI/webview/notify?${new URLSearchParams({
      notifyName: DeviceMemberChangedName,
    })}`;
    biz3utils.triggerScheme(scheme);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {(!gStripe.isFromApp || isAppHome) && (
        <Box sx={{ display: 'flex', alignItems: 'center', pt: isAppHome ? 0 : 1, pl: 2 }}>
          <BackButton onClick={() => navigate(-1)} disableRipple>
            <Typography variant="h3" sx={{ color: 'title.main' }}>
              {t('pages.login.ReturnToMailInput')}
            </Typography>
          </BackButton>
        </Box>
      )}
      <Box sx={{ bgcolor: 'secondary.light', p: 2 }}>
        <Typography sx={{ fontWeight: 'bold', color: 'info.main' }}>
          {t('deviceMember.modifyDeviceNameHint')}
        </Typography>
      </Box>
      <List disablePadding>
        <ListItem>
          <ListItemText primary={t('deviceMember.editName')} />
          <EditableText
            key={deviceUUID}
            initialValue={deviceName}
            onSave={async (newValue, callback) => {
              if (!newValue || !callback) {
                return;
              }
              gManageDevice.updateDeviceName(
                {
                  subUUID: gStripe.customerInfo.subUUID,
                  deviceUUID: deviceUUID,
                  deviceName: newValue,
                },
                (res) => {
                  callback(res.success);
                  res.success && notifyRefreshApp();
                }
              );
            }}
          />
        </ListItem>
      </List>
    </Box>
  );
};

export default MobileDeviceModifyName;
