// Hub3RemoteList.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { Box, Typography, Divider, List, ListItem, ListItemText, ListItemIcon, Drawer } from '@mui/material';
import { Add, MoreHoriz } from '@mui/icons-material';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import { useRemoteCtrl } from '../api/useRemoteCtrl.js';

export default function MobileHub3RemoteList({ deviceUUID, editable = true }) {
  const { gManageDevice } = useContext(GlobalStateContext);
  const { t } = useTranslation();
  const [device, setDevice] = useState({
    stateInfo: {
      remoteList: [],
    },
  });

  // 菜单相关状态
  const [selectedRemote, setSelectedRemote] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);
  const { deleteIRRemote, updateLocalRemoteList } = useRemoteCtrl(gAuth, gStripe, setSnackbarValue);

  // 获取设备信息
  useEffect(() => {
    const foundDevice = gManageDevice.companyDevices.find((item) => item.deviceUUID === deviceUUID);
    if (foundDevice) {
      const deviceWithSafeRemoteList = {
        ...foundDevice,
        stateInfo: {
          ...foundDevice.stateInfo,
          remoteList: foundDevice.stateInfo?.remoteList || [],
        },
      };
      setDevice(deviceWithSafeRemoteList);
    }
  }, [deviceUUID, gManageDevice.companyDevices]);

  // 添加遥控器的处理函数
  const handleAddRemote = () => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.delete('keyLevel');
    url.searchParams.delete('deviceUUID');
    const params = Object.fromEntries(url.searchParams.entries());
    navigate({
      pathname: '/biz/access-control/ir-type',
      search: createSearchParams({ ...params, hub3DeviceId: device.deviceUUID }).toString(),
    });
  };

  // 处理 ListItem 点击事件
  const handleListItemClick = (remote, index) => {
    setSelectedRemote(remote);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const deleteRemote = (remote = selectedRemote) => {
    deleteIRRemote(device.deviceUUID, remote.uuid, (response) => {
      console.log('deleteIRRemote callback response:', response);

      if (response.success) {
        console.log('delete success:', response.data);
        updateLocalRemoteList(device.deviceUUID, remote, true);
      } else {
        console.error('delete failed:', response.message);
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remoteList.deleteFailed'),
          severity: 'error',
        });
      }
    });
    setDrawerOpen(false);
  };

  const gotoRemoteControl = (remote = selectedRemote) => {
    console.log('gotoRemoteControl:', remote);
    let remotePath = '';
    let irTypeNum = parseInt(remote.type);
    if (remote.code === 0) {
      remotePath = '/biz/access-control/learn';
    } else if (irTypeNum === 0xc000) {
      remotePath = '/biz/access-control/remote-air';
    } else {
      remotePath = '/biz/access-control/remote-non-air';
    }
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.delete('keyLevel');
    url.searchParams.delete('deviceUUID');
    const params = Object.fromEntries(url.searchParams.entries());
    navigate({
      pathname: remotePath,
      search: createSearchParams({
        ...params,
        hub3DeviceId: device.deviceUUID,
        remote: JSON.stringify(remote),
      }).toString(),
    });
    setDrawerOpen(false);
  };
  const remoteList = device.stateInfo?.remoteList || [];
  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
      }}
    >
      <List disablePadding>
        {remoteList.map((remote, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{ px: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                gotoRemoteControl(remote);
              }}
            >
              <ListItemText primary={<Typography>{remote.alias || `Remote ${index + 1}`}</Typography>} />
              {editable && (
                <ListItemIcon
                  sx={{ minWidth: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleListItemClick(remote, index);
                  }}
                >
                  <MoreHoriz />
                </ListItemIcon>
              )}
            </ListItem>
          </React.Fragment>
        ))}
        {editable && (
          <>
            {remoteList?.length > 0 && <Divider sx={{ opacity: 0.4 }} />}
            <ListItem onClick={handleAddRemote} sx={{ px: 0 }}>
              <ListItemText primary={<Typography>{t('pages.ir.remote.addRemote')}</Typography>} />
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <Add />
              </ListItemIcon>
            </ListItem>
          </>
        )}
      </List>
      {/* 移动端底部抽屉 */}
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
            <ListItem>
              <Typography sx={{ color: 'rgb(204, 204, 204)' }}>
                {selectedRemote?.alias || `Remote ${selectedIndex + 1}`}
              </Typography>
            </ListItem>
            <ListItem onClick={() => gotoRemoteControl(selectedRemote)}>
              <Typography>{t('pages.ir.remote.detail')}</Typography>
            </ListItem>
            <ListItem onClick={() => deleteRemote(selectedRemote)}>
              <Typography color="error.main">{t('pages.ir.remote.delete')}</Typography>
            </ListItem>
            <ListItem onClick={() => setDrawerOpen(false)}>
              <Typography>{t('deviceMember.opt.cancel')}</Typography>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}
