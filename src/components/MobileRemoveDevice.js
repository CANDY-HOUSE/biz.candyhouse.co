import { isScriptBotModel, saveBotScript } from '@/services/botScripts';
import { cloudCallback } from '@/services/cloudCallback';
import { deviceService, isAppHome } from '@/services/deviceService';
import { guestDevices, forgetGuestDevice } from '@/services/guestDevices';
import { Box, Drawer, ListItem, List, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCallback, useContext, useState } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { biz3utils } from '@/utils/biz3utils';
import { useNavigate } from 'react-router-dom';

const MobileRemoveDevice = ({ deviceUUID, subUUID, deviceName, showHint = true, named = false }) => {
  const { gManageDevice, setSnackbarValue } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const navigate = useNavigate();

  const requestRefresh = useCallback(() => {
    if (isAppHome) {
      biz3utils.triggerBridge({ action: 'requestRefreshApp' });
      navigate({ pathname: '/', search: '?appHome=1&fromType=app' }, { replace: true });
      return;
    }
    if (
      biz3utils.triggerBridge({
        action: 'requestRefreshApp',
      })
    ) {
      biz3utils.triggerBridge({
        action: 'requestDestroySelf',
      });
    } else {
      navigate(-1);
    }
  }, [navigate]);

  return (
    <>
      <ListItem onClick={() => setDrawerOpen(true)} sx={{ justifyContent: 'center', height: '48px' }}>
        <Typography sx={{ color: 'error.main', fontWeight: named ? 'bold' : undefined }}>
          {named ? t('lockExtras.deleteName', { deviceName }) : t('pages.ir.remote.delete')}
        </Typography>
      </ListItem>
      {showHint && (
        <Box sx={{ bgcolor: 'secondary.main', pl: 2, py: 0.5 }}>
          <Typography color="info.light" sx={{ lineHeight: '30px' }}>
            {t('pages.sesameAccessControlDevice.index.DropKeyDesc', { deviceName })}
          </Typography>
        </Box>
      )}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            maxHeight: '50vh',
          },
        }}
      >
        <Box sx={{ width: '100%', '& .MuiListItem-root': { justifyContent: 'center' } }}>
          <List>
            <ListItem
              onClick={() => {
                setRemoveLoading(true);
                const target = gManageDevice.companyDevices.find(
                  (item) => item.deviceUUID?.toUpperCase() === deviceUUID.toUpperCase()
                );
                const remove = () =>
                  gManageDevice.removeSesameDevices(
                    [
                      {
                        deviceUUID,
                        subUUID,
                      },
                    ],
                    async (res) => {
                      try {
                        if (!res.success) return;
                        if (isAppHome) {
                          await deviceService.request('dropDevice', { deviceUUID });
                          deviceService
                            .request('pushInfo')
                            .then(({ data }) =>
                              cloudCallback((cb) =>
                                gManageDevice.switchDeviceNotify(
                                  { pushToken: data.pushToken, deviceUUID, enablePush: false },
                                  cb
                                )
                              )
                            )
                            .catch(() => {});
                          guestDevices()
                            .filter(
                              (item) =>
                                item.deviceUUID.toUpperCase() === deviceUUID.toUpperCase() && item.subUUID === subUUID
                            )
                            .forEach(forgetGuestDevice);
                        }
                        requestRefresh();
                      } catch (_) {
                        setSnackbarValue({
                          logScope: 'components/MobileRemoveDevice.remove',
                          logReason: 'lockSettings.failed',
                          open: true,
                          msg: t('lockSettings.failed'),
                          severity: 'error',
                        });
                      } finally {
                        setRemoveLoading(false);
                        setDrawerOpen(false);
                      }
                    },
                    true
                  );
                if (isAppHome && isScriptBotModel(target?.deviceModel)) {
                  saveBotScript(deviceUUID, { deleteAll: true })
                    .then(remove)
                    .catch(() => {
                      setRemoveLoading(false);
                      setSnackbarValue({
                        logScope: 'components/MobileRemoveDevice.MobileRemoveDevice',
                        logReason: 'lockSettings.failed',
                        open: true,
                        msg: t('lockSettings.failed'),
                        severity: 'error',
                      });
                    });
                } else remove();
              }}
            >
              <Typography color="error.main">{t('deviceMember.opt.ok')}</Typography>
              {removeLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
            </ListItem>
            <ListItem onClick={() => setDrawerOpen(false)}>
              <Typography>{t('deviceMember.opt.cancel')}</Typography>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};
export default MobileRemoveDevice;
