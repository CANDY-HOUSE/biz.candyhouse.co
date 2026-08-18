import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, Typography, Button } from '@mui/material';
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

const Devices = () => {
  const location = useLocation();
  const isBizDevicesRoute = location.pathname.includes('/biz/devices/list');
  const isBizAccessControlRoute = location.pathname.includes('/biz/access-control/index');
  const isBizRoute = isBizDevicesRoute || isBizAccessControlRoute;

  const { gManageDevice, gManageGroup, setSnackbarValue, gIot, gStripe, setModalContent, setCustomModalOpen } =
    useContext(GlobalStateContext);
  const floatingAddRef = useRef(null);
  const { navigateToDeviceDetail, navigateToDeviceShare } = useNavigateUtils();
  const [ssmDevices, setSsmDevices] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (isBizDevicesRoute) {
      setSsmDevices(gManageDevice.filteredSsmDevices);
    } else if (isBizAccessControlRoute) {
      setSsmDevices(gManageDevice.filteredAccessControlDevices);
    } else {
      setSsmDevices(gManageDevice.companyDevices);
    }
  }, [
    isBizDevicesRoute,
    isBizAccessControlRoute,
    gManageDevice.filteredSsmDevices,
    gManageDevice.filteredAccessControlDevices,
    gManageDevice.companyDevices,
  ]);

  // Biz 路由下的个人设备导入功能
  const handleOpenModal = useCallback(() => {
    if (!isBizRoute) return;
    setModalContent(
      <CheckTable
        loadingAble
        title={'入退室システムへ登録するデバイスを選択'}
        setOpenModal={setCustomModalOpen}
        enableFilter={true}
        selectableRows={'multiple'}
        handleClose={setCustomModalOpen(false)}
        data={isBizDevicesRoute ? gManageDevice.canChoosedSsmDevices : gManageDevice.canChoosedAccessControlDevices}
        handleCheck={handleCheck}
      />
    );
    setCustomModalOpen(true);
  }, [
    isBizRoute,
    isBizDevicesRoute,
    setModalContent,
    setCustomModalOpen,
    gManageDevice.canChoosedSsmDevices,
    gManageDevice.canChoosedAccessControlDevices,
  ]);

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
        title={'デバイスを選択'}
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
            新規デバイスを追加
          </Typography>
          <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Button variant="text" component="label" startIcon={<QrCodeIcon />} sx={{ justifyContent: 'flex-start' }}>
              QRコードで追加
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const fileInput = e.target;
                  const fail = () => {
                    floatingAddRef.current.handleClose();
                    setSnackbarValue({
                      open: true,
                      msg: '読み取りに失敗しました。QRコードが正しいか確認してください。',
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
                          msg: '読み取りに失敗しました。QRコードが正しいか確認してください。',
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
            {isBizRoute && (
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
        {!isBizAccessControlRoute && (
          <Box>
            <Typography variant="h2" sx={{ px: 1, mt: 1 }}>
              合鍵発行
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
                デバイスを選択
              </Button>
            </Box>
          </Box>
        )}
        {isBizRoute && (
          <Box>
            <Typography variant="h2" sx={{ px: 1, mt: 1 }}>
              ファイルダウンロード
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
                CSVダウンロード
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
                Excelダウンロード
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    ),
    [
      isBizRoute,
      isBizAccessControlRoute,
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
      if (!ssmDevices?.[0]?.orderKey) return;
      const moved = newData[newIndex];
      if (!moved) return;
      const prevKey = newData[newIndex - 1]?.orderKey;
      const nextKey = newData[newIndex + 1]?.orderKey;
      gManageDevice.updateDeviceOrderKey({
        subUUID: moved.subUUID,
        deviceUUID: moved.deviceUUID,
        prevKey,
        nextKey,
      });
    },
    [gManageDevice, ssmDevices]
  );

  const handleItemClick = useCallback(
    (device) => {
      navigateToDeviceDetail(device);
    },
    [navigateToDeviceDetail]
  );

  const handleSearch = useCallback((searchText, allData) => {
    return allData.filter((item) => item.deviceName.includes(searchText));
  }, []);

  const canDrag = !isBizRoute && Boolean(ssmDevices?.[0]?.orderKey);
  const dragEndHandler = canDrag ? handleDragEnd : undefined;

  return (
    <GenericDeviceListContainer
      ref={floatingAddRef}
      dataSource={ssmDevices}
      onDragEnd={dragEndHandler}
      onItemClick={handleItemClick}
      onSearch={handleSearch}
      popupComponent={addDeviceComp}
      gIot={gIot}
      isMobile={!gStripe.isFromApp}
    />
  );
};

export default Devices;
