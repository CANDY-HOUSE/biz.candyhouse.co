import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { isAppHome } from '@/services/deviceService';
import React, { useContext } from 'react';
import EditableText from './EditableText';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { Box, List, ListItem, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils';
import { useSettingsBack, useSettingsSearchParams } from '@/components/settingsSubPage';
import SettingsGroup, { settingsHeaderSx, settingsPageSx } from './SettingsGroup';

const MobileDeviceModifyName = () => {
  const DeviceMemberChangedName = 'DeviceMemberChanged';
  const { gManageDevice, gStripe } = useContext(GlobalStateContext);
  const [searchParams] = useSettingsSearchParams();
  const deviceUUID = searchParams.get('deviceUUID');
  const deviceName = searchParams.get('deviceName') || '';
  const isBridgingType = searchParams.get('notifyType') === 'bridge';
  const { t } = useTranslation();
  const back = useSettingsBack();

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
    <Box sx={{ width: '100%', minHeight: '100%', bgcolor: settingsPageSx.bgcolor }}>
      {isAppHome ? (
        <PageHeader sx={settingsHeaderSx} onBack={() => back()} />
      ) : (
        !gStripe.isFromApp && (
          <Box sx={{ display: 'flex', alignItems: 'center', pt: 1, pl: 2 }}>
            <BackButton onClick={() => back()} disableRipple />
          </Box>
        )
      )}
      <SettingsGroup header={t('deviceMember.modifyDeviceNameHint')} sx={{ pt: '16px' }}>
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
      </SettingsGroup>
    </Box>
  );
};

export default MobileDeviceModifyName;
