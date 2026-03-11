import { Box, Drawer, ListItem, List, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCallback, useContext, useState } from 'react';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { biz3utils } from '@/utils/biz3utils';
import { useNavigate } from 'react-router-dom';

const MobileRemoveDevice = ({ deviceUUID, subUUID, deviceName, showHint = true }) => {
  const { gManageDevice } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const navigate = useNavigate();

  const requestRefresh = useCallback(() => {
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
  }, []);

  return (
    <>
      <ListItem onClick={() => setDrawerOpen(true)} sx={{ justifyContent: 'center', height: '48px' }}>
        <Typography sx={{ color: 'error.main' }}>{t('pages.ir.remote.delete')}</Typography>
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
                gManageDevice.removeSesameDevices(
                  [
                    {
                      deviceUUID,
                      subUUID,
                    },
                  ],
                  (res) => {
                    setRemoveLoading(false);
                    res.success && requestRefresh();
                    setDrawerOpen(false);
                  },
                  true
                );
              }}
            >
              <Typography color="error.main">{t('deviceMember.opt.ok')}</Typography>
              {removeLoading && <CircularProgress size={16} color="info" sx={{ ml: 1 }} />}
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
