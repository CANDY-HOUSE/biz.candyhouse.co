import { isAppHome } from '@/services/deviceService';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { createSearchParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, Typography, Button } from '@mui/material';
import DeviceDetailPanel from '@/components/DeviceDetailPanel';
import { DetailPanelContext } from '@/components/detailPanelContext';
import { SesameNavIcon } from '@/components/biz/layout/navIcons';
import MasterDetail, { fabInListSx, useMasterDetail } from '@/components/MasterDetail';
import QrCodeIcon from '@mui/icons-material/QrCode';
import KeyIcon from '@mui/icons-material/Key';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import { biz3utils } from '@/utils/biz3utils';
import { gUtils } from '@/utils/gUtils';
import GenericDeviceListContainer from '@/components/biz/device/GenericDeviceListContainer';
import CheckTable from '@/components/biz/CheckTable';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';
import { useTranslation } from 'react-i18next';

// all: the personal space's list of every device; doors / authenticators: the company space's two menus.
const categories = {
  all: { devices: (m) => m.companyDevices, sortable: true, share: true },
  doors: {
    devices: (m) => m.filteredSsmDevices,
    importable: (m) => m.canChoosedSsmDevices,
    share: true,
    download: true,
  },
  authenticators: {
    devices: (m) => m.filteredAccessControlDevices,
    importable: (m) => m.canChoosedAccessControlDevices,
    download: true,
  },
};

const Devices = ({ category = 'all' }) => {
  const location = useLocation();
  const config = categories[category];

  const { gManageDevice, gManageGroup, setSnackbarValue, gIot, gStripe, setModalContent, setCustomModalOpen } =
    useContext(GlobalStateContext);
  const floatingAddRef = useRef(null);
  const { navigateToDeviceDetail, navigateToDeviceShare } = useNavigateUtils();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const masterDetail = useMasterDetail();
  const selectedUUID = masterDetail ? searchParams.get('deviceUUID') : null;
  const ssmDevices = config.devices(gManageDevice);

  const handleOpenModal = useCallback(() => {
    if (!config.importable) return;
    setModalContent(
      <CheckTable
        loadingAble
        title={t('manage.devices.selectToImport')}
        setOpenModal={setCustomModalOpen}
        enableFilter={true}
        selectableRows={'multiple'}
        handleClose={setCustomModalOpen(false)}
        data={config.importable(gManageDevice)}
        handleCheck={handleCheck}
      />
    );
    setCustomModalOpen(true);
  }, [config, gManageDevice, setModalContent, setCustomModalOpen, t]);

  const handleCheck = useCallback(
    (is, cb) => {
      gManageDevice.addSesameDevicesToBiz3(is, (res) => {
        setCustomModalOpen(false);
        cb && cb(res);
      });
    },
    [gManageDevice, setCustomModalOpen]
  );

  const canSelectedDevices = useMemo(() => {
    return ssmDevices.filter((it) => parseInt(it.keyLevel) < 2);
  }, [ssmDevices]);

  const onChooseSesameClickHandler = (cb) => {
    setModalContent(
      <CheckTable
        title={t('contacts.selectDevices')}
        setOpenModal={setCustomModalOpen}
        enableFilter={!gStripe.isFromApp}
        selectableRows={'multiple'}
        useCustomSelection={true}
        handleClose={setCustomModalOpen(false)}
        data={canSelectedDevices}
        handleCheck={(it) => {
          setCustomModalOpen(false);
          cb(it);
        }}
        isMobile={gStripe.isFromApp}
      />
    );
    setCustomModalOpen(true);
  };

  const addDeviceComp = useMemo(
    () => (
      <Box>
        <Box>
          <Typography variant="h2" sx={{ px: 1 }}>
            {t('manage.devices.addNew')}
          </Typography>
          <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Button variant="text" component="label" startIcon={<QrCodeIcon />} sx={{ justifyContent: 'flex-start' }}>
              {t('contacts.addByQr')}
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const fileInput = e.target;
                  const fail = () => {
                    floatingAddRef.current.handleClose();
                    setSnackbarValue({
                      open: true,
                      msg: t('contacts.qrReadFailed'),
                    });
                    fileInput.value = '';
                  };
                  // 1) 解码图片得到二维码 URL（qrToken）
                  biz3utils.readQrcodeUrl(e.target.files[0], (err, qrUrl) => {
                    if (!qrUrl) {
                      fail();
                      return;
                    }
                    // 2) 先去服务端换取真正的二维码内容（对齐 app 的 redeem 流程）
                    gManageGroup.redeemQRToken(qrUrl, (res) => {
                      floatingAddRef.current.handleClose();
                      if (!res.success) {
                        setSnackbarValue({
                          logScope: 'pages/personal/devices/index.addDeviceComp',
                          severity: 'error',
                          open: true,
                          msg: res.message,
                        });
                        fileInput.value = '';
                        return;
                      }
                      const redeemedUrl = res?.success ? res?.data : null;
                      // 3) 从换取的内容解析设备信息
                      const qrKeyInfo = redeemedUrl ? biz3utils.parseDeviceKeyFromUrl(redeemedUrl) : null;
                      if (!qrKeyInfo) {
                        setSnackbarValue({
                          open: true,
                          msg: t('contacts.qrReadFailed'),
                        });
                        fileInput.value = '';
                        return;
                      }
                      gManageDevice.addSesameDevicesToBiz3([qrKeyInfo]);
                      fileInput.value = '';
                    });
                  });
                }}
              />
            </Button>
            {config.importable && (
              <Button
                variant="text"
                startIcon={<SmartphoneIcon />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  handleOpenModal();
                  floatingAddRef.current.handleClose();
                }}
              >
                {t('pages.sesameAccessControlDevice.index.PersonallyRegisteredDevices')}
              </Button>
            )}
          </Box>
        </Box>
        {config.share && (
          <Box>
            <Typography variant="h2" sx={{ px: 1, mt: 1 }}>
              {t('manage.share.issueKey')}
            </Typography>
            <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="text"
                startIcon={<KeyIcon />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  floatingAddRef.current.handleClose();
                  onChooseSesameClickHandler((selectedItems) => {
                    if (selectedItems.length < 1) return;
                    navigateToDeviceShare(selectedItems.map((item) => item.deviceUUID).join(','));
                  });
                }}
              >
                {t('contacts.selectDevices')}
              </Button>
            </Box>
          </Box>
        )}
        {config.download && (
          <Box>
            <Typography variant="h2" sx={{ px: 1, mt: 1 }}>
              {t('manage.devices.fileDownload')}
            </Typography>
            <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="text"
                startIcon={<CloudDownloadIcon />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  floatingAddRef.current.handleClose();
                  gUtils.csvUtils.downloadLists(ssmDevices);
                }}
              >
                {t('manage.devices.csvDownload')}
              </Button>
              <Button
                variant="text"
                startIcon={<SimCardDownloadIcon />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  floatingAddRef.current.handleClose();
                  gUtils.csvUtils.downloadLists(ssmDevices, false);
                }}
              >
                {t('manage.devices.excelDownload')}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    ),
    [
      config,
      setSnackbarValue,
      gManageDevice,
      t,
      handleOpenModal,
      onChooseSesameClickHandler,
      navigateToDeviceShare,
      ssmDevices,
    ]
  );

  const handleDragEnd = useCallback(
    (newData, _, newIndex) => {
      if (!ssmDevices.some((device) => device.orderKey)) return;
      const moved = newData[newIndex];
      if (!moved) return;
      const prevKey = newData
        .slice(0, newIndex)
        .reverse()
        .find((device) => device.orderKey)?.orderKey;
      const nextKey = newData.slice(newIndex + 1).find((device) => device.orderKey)?.orderKey;
      gManageDevice.updateDeviceOrderKey(
        { subUUID: moved.subUUID, deviceUUID: moved.deviceUUID, prevKey, nextKey },
        undefined,
        newData.map((device) => device.deviceUUID)
      );
    },
    [gManageDevice, ssmDevices]
  );

  // The selection replaces the list's history entry, so back leaves the list as before.
  const selectDevice = useCallback(
    (device) => {
      navigate(
        {
          pathname: location.pathname,
          search: device
            ? createSearchParams({
                deviceUUID: device.deviceUUID,
                keyLevel: device.keyLevel,
                deviceModel: device.deviceModel,
                deviceName: device.deviceName,
              }).toString()
            : '',
        },
        { replace: true }
      );
    },
    [navigate, location.pathname]
  );

  const handleItemClick = useCallback(
    (device) => {
      if (masterDetail) selectDevice(device);
      else navigateToDeviceDetail(device);
    },
    [masterDetail, selectDevice, navigateToDeviceDetail]
  );

  // Removed devices can linger in the list until it refreshes; never pick one of them.
  const removedUUIDs = useRef([]);
  const firstDevice = ssmDevices.find((device) => !removedUUIDs.current.includes(device.deviceUUID));
  useEffect(() => {
    if (masterDetail && !selectedUUID && firstDevice) selectDevice(firstDevice);
  }, [masterDetail, selectedUUID, firstDevice?.deviceUUID]);

  const panel = useMemo(
    () => ({
      onRemoved: (deviceUUID) => {
        removedUUIDs.current.push(deviceUUID);
        selectDevice(null);
      },
    }),
    [selectDevice]
  );

  const handleSearch = useCallback((searchText, allData) => {
    return allData.filter((item) => item.deviceName?.includes(searchText));
  }, []);

  const canDrag = config.sortable && ssmDevices.some((device) => device.orderKey);
  const dragEndHandler = canDrag ? handleDragEnd : undefined;

  const list = (
    <GenericDeviceListContainer
      ref={floatingAddRef}
      dataSource={ssmDevices}
      onDragEnd={dragEndHandler}
      onItemClick={handleItemClick}
      onSearch={handleSearch}
      popupComponent={addDeviceComp}
      gIot={gIot}
      enableFloatingAdd={!isAppHome}
      isMobile={!gStripe.isFromApp}
      selectedUUID={selectedUUID}
      fabSx={masterDetail ? fabInListSx : undefined}
    />
  );

  return (
    <>
      {masterDetail ? (
        <MasterDetail
          list={list}
          placeholder={<SesameNavIcon size={72} />}
          panel={
            selectedUUID && (
              <DetailPanelContext.Provider value={panel}>
                <DeviceDetailPanel />
              </DetailPanelContext.Provider>
            )
          }
        />
      ) : (
        list
      )}
      {isAppHome && category === 'all' && gManageDevice.devicesLoaded && !gManageDevice.companyDevices.length && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: '20px',
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{ color: 'text.secondary', textAlign: 'center', fontSize: 17, fontWeight: 600, maxWidth: '32rem' }}
          >
            {t('appHome.noDevices')}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default Devices;
