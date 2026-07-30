import React, { useContext, useMemo, useState } from 'react';
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
  const { gIot, gManageDevice, setCustomModalOpen, setModalContent, gStripe } = useContext(GlobalStateContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const singleLineTextSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const devices = useMemo(() => {
    if (!currentDevice || currentDevice.stateInfo?.ssks?.length < 1) return [];
    //[eddy todo] hub3 与 touch 返回的 bindSSM 应该格式一致
    let ssmDeviceUUIDs = currentDevice.stateInfo?.sesameDevices ?? [];
    let ssks = currentDevice.stateInfo?.ssks;
    if (ssmDeviceUUIDs.length < 1 && ssks?.length > 0) {
      const uuidLength = 36;
      for (let i = 0; i < ssks.length; i += uuidLength + 2) {
        const uuid = ssks.substr(i, uuidLength);
        if (uuid.length === uuidLength) {
          ssmDeviceUUIDs.push(uuid);
        }
      }
      if (!ssks || ssks.length < 36) {
        ssmDeviceUUIDs = [];
      }
    }
    if (ssmDeviceUUIDs.length < 1) return [];
    return gManageDevice.companyDevices.filter((it) => ssmDeviceUUIDs.includes(it.deviceUUID));
  }, [currentDevice, gManageDevice.companyDevices]);

  const canAddSesameDevice = useMemo(() => {
    return gManageDevice.companyDevices.filter((it) => {
      if (!gUtils.canWifiModuleControl(it.deviceModel) || parseInt(it.keyLevel) > 1) {
        return false;
      }
      if (devices.length < 1) {
        return true;
      }
      return !devices.some((d) => d.deviceUUID === it.deviceUUID);
    });
  }, [devices, gManageDevice.companyDevices]);

  const onAddSesameButtonClickHandler = () => {
    setModalContent(
      <CheckTable
        loadingAble
        title={'デバイスを選択'}
        setOpenModal={setCustomModalOpen}
        enableFilter={!gStripe.isFromApp}
        selectableRows={'single'}
        useCustomSelection={true}
        handleClose={setCustomModalOpen(false)}
        data={canAddSesameDevice}
        handleCheck={handleCheck}
        isMobile={gStripe.isFromApp}
      />
    );
    setCustomModalOpen(true);
  };

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
      gManageDevice.setCompanyDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.deviceUUID === currentDevice.deviceUUID
            ? { ...device, stateInfo: { ...device.stateInfo, ssks: data.ssks } }
            : device
        )
      );
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
