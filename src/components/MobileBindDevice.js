import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Divider, List, ListItem, ListItemText, ListItemIcon, Drawer } from '@mui/material';
import { MoreHoriz, Add as AddIcon } from '@mui/icons-material';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import { gConfig } from '@/constants/gConfig';
import { registerIotCallback } from '@/hooks/useIotCallbackRegistry';
import CheckTable from './biz/CheckTable';
import { gUtils } from '@/utils/gUtils';
import { useNavigate } from 'react-router-dom';

const MobileBindDevice = ({ device: currentDevice, editable = true }) => {
  const { gIot, gManageDevice, setCustomModalOpen, setModalContent, gStripe, customModalOpen } =
    useContext(GlobalStateContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const singleLineTextSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const sourceDevices = useMemo(
    () => (gManageDevice.companyDevices.length > 0 ? gManageDevice.companyDevices : gManageDevice.userDevices),
    [gManageDevice.companyDevices, gManageDevice.userDevices]
  );

  const devices = useMemo(() => {
    const sesameDevices = currentDevice?.stateInfo?.sesameDevices ?? [];
    if (sesameDevices.length < 1) return [];
    if (typeof sesameDevices[0] === 'object') {
      return sesameDevices;
    }
    return gManageDevice.companyDevices.filter((it) => sesameDevices.includes(it.deviceUUID));
  }, [currentDevice, gManageDevice.companyDevices]);

  const canAddSesameDevice = useMemo(() => {
    return sourceDevices.filter((it) => {
      if (!gUtils.canWifiModuleControl(it.deviceModel) || parseInt(it.keyLevel) > 1) {
        return false;
      }
      if (devices.length < 1) {
        return true;
      }
      return !devices.some((d) => d.deviceUUID === it.deviceUUID);
    });
  }, [devices, sourceDevices]);

  const onAddSesameButtonClickHandler = () => {
    setAddOpen(true);
    if (gManageDevice.userDevices.length < 1) {
      gManageDevice.getUserDevices(true);
    }
    setCustomModalOpen(true);
  };
  useEffect(() => {
    if (!customModalOpen && addOpen) setAddOpen(false);
  }, [customModalOpen, addOpen]);

  useEffect(() => {
    if (!addOpen) return;
    setModalContent(
      <CheckTable
        loadingAble
        title={'デバイスを選択'}
        setOpenModal={setCustomModalOpen}
        enableFilter={!gStripe.isFromApp}
        selectableRows={'single'}
        useCustomSelection={true}
        handleClose={() => setCustomModalOpen(false)}
        data={canAddSesameDevice}
        handleCheck={handleCheck}
        isMobile={gStripe.isFromApp}
      />
    );
  }, [addOpen, canAddSesameDevice]);

  const performSesameOperation = (cmdCode, deviceData, onSuccess) => {
    gIot.sendCommandToHub3WithConnectionId({
      device_id: currentDevice.deviceUUID,
      cmd: cmdCode,
      secretKey: currentDevice.secretKey,
      iotPayload: {
        sesameId: deviceData.deviceUUID,
        ssmSecKa: deviceData.secretKey,
        nickName: deviceData.deviceName,
        deviceModel: deviceData.deviceModel,
      },
    });
    registerIotCallback(cmdCode, (iotDeviceUUID, data) => {
      console.log(`[${cmdCode}]`, iotDeviceUUID, data);
      //调查 iot 时序，为何立即取状态不对应
      setTimeout(() => {
        gManageDevice.getDeviceStatus(currentDevice.deviceUUID);
      }, 3000);
      onSuccess && onSuccess(data);
    });
  };

  const handleCheck = (selectedItems, cb) => {
    setCustomModalOpen(false);
    performSesameOperation(gConfig.cmdCode.SSM3_ITEM_ADD_SESAME, selectedItems[0], () => cb && cb());
  };

  const onDelSesameButtonClickHandler = (selectedItem) => {
    performSesameOperation(gConfig.cmdCode.SSM3_ITEM_REMOVE_SESAME, selectedItem);
  };

  const handleOSUpdateClick = (device) => {
    setDrawerOpen(false);
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set('ssmUUID', device.deviceUUID);
    navigate(`/biz/wifi-module/ssm-upgrade?${searchParams.toString()}`);
  };

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
      }}
    >
      {!editable && devices?.length < 1 && (
        <Typography color="info.light" sx={{ py: 1 }}>
          {t('pages.sesameAccessControlDevice.index.NoResult')}
        </Typography>
      )}
      <List disablePadding>
        {devices.map((device, index) => (
          <React.Fragment key={`${device.deviceUUID}${index}`}>
            <ListItem
              sx={{ px: 0 }}
              onClick={() => {
                if (!editable) return;
                handleOSUpdateClick(device);
              }}
            >
              <ListItemText
                sx={{ minWidth: 0 }}
                primary={<Typography sx={singleLineTextSx}>{device.deviceName}</Typography>}
              />
              {editable && (
                <ListItemIcon
                  sx={{ minWidth: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDevice(device);
                    setDrawerOpen(true);
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
            {devices?.length > 0 && <Divider sx={{ opacity: 0.4 }} />}
            <ListItem onClick={() => onAddSesameButtonClickHandler()} sx={{ px: 0 }}>
              <ListItemText
                sx={{ minWidth: 0 }}
                primary={
                  <Typography sx={singleLineTextSx}>{t('pages.sesameAccessControlDevice.index.AddSesame')}</Typography>
                }
              />
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <AddIcon />
              </ListItemIcon>
            </ListItem>
          </>
        )}
      </List>
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
              <Typography sx={{ color: 'rgb(204, 204, 204)', ...singleLineTextSx }}>
                {selectedDevice?.deviceName}
              </Typography>
            </ListItem>
            <ListItem onClick={() => handleOSUpdateClick(selectedDevice)}>
              <Typography>{t('pages.sesameAccessControlDevice.index.OSUpdate')}</Typography>
            </ListItem>
            <ListItem
              onClick={() => {
                setDrawerOpen(false);
                onDelSesameButtonClickHandler(selectedDevice);
              }}
            >
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
};
export default MobileBindDevice;
