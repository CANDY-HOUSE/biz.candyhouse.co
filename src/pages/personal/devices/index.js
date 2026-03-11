import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Box, Typography, Button } from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { biz3utils } from '@/utils/biz3utils';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import SesameDeviceList from '@/components/personal/SesameDeviceList';
import { Edit } from '@mui/icons-material';
import CheckTable from '@/components/biz/CheckTable';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';

const Devices = () => {
  const { gManageDevice, setSnackbarValue, gIot, gStripe, setModalContent, setCustomModalOpen } =
    useContext(GlobalStateContext);
  const [ssmDevices, setSsmDevices] = useState([]);
  const floatingAddRef = useRef(null);
  const { navigateToDeviceDetail, navigateToDeviceShare } = useNavigateUtils();

  useEffect(() => {
    setSsmDevices(gManageDevice.companyDevices);
  }, [gManageDevice.companyDevices]);

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
          <Box sx={{ px: 1 }}>
            <Button variant="text" component="label" startIcon={<QrCodeIcon />}>
              QRコードで追加
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const fileInput = e.target;
                  biz3utils.readQrcode(e.target.files[0], (e, qrKeyInfo) => {
                    floatingAddRef.current.handleClose();
                    if (!qrKeyInfo) {
                      setSnackbarValue({
                        open: true,
                        msg: '読み取りに失敗しました。QRコードが正しいか確認してください。',
                      });
                      return;
                    }
                    if (biz3utils.hasListObj(gManageDevice.filteredSsmDevices, [qrKeyInfo], 'deviceUUID')) {
                      setSnackbarValue({
                        open: true,
                        msg: '接続済みです',
                      });
                    } else {
                      const param = [{ ...qrKeyInfo, subUUID: gStripe.customerInfo.subUUID }];
                      gManageDevice.addSesameDevicesToBiz3(param);
                    }
                    fileInput.value = '';
                  });
                }}
              />
            </Button>
          </Box>
        </Box>
        <Box>
          <Typography variant="h2" sx={{ px: 1 }}>
            合鍵発行
          </Typography>
          <Box sx={{ px: 1 }}>
            <Button
              variant="text"
              component="label"
              startIcon={<Edit />}
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
      </Box>
    ),
    [setSnackbarValue, gManageDevice, gStripe.customerInfo.subUUID, onChooseSesameClickHandler]
  );

  const handleSearch = useCallback(
    (e) => {
      if (!e) {
        setSsmDevices(gManageDevice.companyDevices);
        return;
      }
      const result = gManageDevice.companyDevices.filter((item) => {
        return item.deviceName.includes(e);
      });
      setSsmDevices(result);
    },
    [gManageDevice.companyDevices]
  );

  const handleRowClick = useCallback(
    (index) => {
      const device = ssmDevices[index];
      navigateToDeviceDetail(device);
    },
    [ssmDevices, navigateToDeviceDetail]
  );

  return (
    <SesameFloatingAdd ref={floatingAddRef} isMobile={!gStripe.isFromApp} popupComponent={addDeviceComp}>
      <SesameDeviceList
        devices={ssmDevices}
        gIot={gIot}
        onDragEnd={(newData, _oldIdx, _newIdx) => {
          gManageDevice.reorderDevice(newData);
        }}
        callSearch={handleSearch}
        callRowClick={handleRowClick}
      />
    </SesameFloatingAdd>
  );
};

export default Devices;
