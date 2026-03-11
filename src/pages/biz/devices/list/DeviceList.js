import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { Card, CardHeader, Box, Typography, Button, CardContent, Tooltip } from '@mui/material';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import InfoIcon from '@mui/icons-material/Info';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { biz3utils } from '@/utils/biz3utils';
import { useTranslation } from 'react-i18next';
import CheckTable from '@/components/biz/CheckTable';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';

const DeviceList = () => {
  const { gManageDevice, setSnackbarValue, gIot, setModalContent, setCustomModalOpen, gMediaType } =
    useContext(GlobalStateContext);
  const [ssmDevices, setSsmDevices] = useState([]);
  const { t } = useTranslation(); // i18n
  const { navigateToDeviceDetail, navigateToDeviceShare } = useNavigateUtils();
  const floatingAddRef = useRef(null);

  const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))({
    [`& .${tooltipClasses.tooltip}`]: {
      maxWidth: 500,
    },
  });

  const handleOpenModal = async () => {
    setModalContent(
      <CheckTable
        loadingAble
        title={'入退室システムへ登録するデバイスを選択'}
        setOpenModal={setCustomModalOpen}
        enableFilter={true}
        selectableRows={'multiple'}
        handleClose={setCustomModalOpen(false)}
        data={gManageDevice.canChoosedSsmDevices}
        handleCheck={handleCheck}
      />
    );
    setCustomModalOpen(true);
  };

  const handleCheck = (is, cb) => {
    gManageDevice.addSesameDevicesToBiz3(is, (res) => {
      setCustomModalOpen(false);
      cb && cb(res);
    });
  };

  useEffect(() => {
    setSsmDevices(gManageDevice.filteredSsmDevices);
  }, [gManageDevice.filteredSsmDevices]);

  const addDeviceComp = useMemo(
    () => (
      <Card>
        <CardHeader
          title={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h2">新規デバイスを追加</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ display: 'flex' }}>
            <Typography>新規デバイスの追加方法を選択</Typography>
            {!gMediaType.isMobile && (
              <CustomWidthTooltip
                title={
                  <div>
                    【QRコード】QRコードからデバイスをインポート
                    <br />【{t('pages.sesameAccessControlDevice.index.PersonallyRegisteredDevices')}
                    】個人でセサミアプリに登録済みのデバイスをインポート
                  </div>
                }
                placement="right-start"
              >
                <InfoIcon sx={{ color: '#cccccc', cursor: 'pointer', ml: '5px' }} />
              </CustomWidthTooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex' }}>
            <Button varient="text" component="label" startIcon={<QrCodeIcon />}>
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
                      gManageDevice.addSesameDevicesToBiz3([qrKeyInfo]);
                    }
                    fileInput.value = '';
                  });
                }}
              />
            </Button>
            <Button
              variant="text"
              startIcon={<SmartphoneIcon />}
              onClick={() => {
                handleOpenModal(true);
                floatingAddRef.current.handleClose();
              }}
            >
              {t('pages.sesameAccessControlDevice.index.PersonallyRegisteredDevices')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    ),
    [t, handleOpenModal, setSnackbarValue, gManageDevice]
  );

  return (
    <SesameFloatingAdd ref={floatingAddRef} show={gMediaType.isMobile} popupComponent={addDeviceComp}>
      <DataTable
        isMobile={gMediaType.isMobile}
        data={ssmDevices}
        isBind={false}
        isBack={false}
        rowHeight={'large'}
        isKey={true}
        columns={DataTableColumns.ssmDevices({ datas: ssmDevices, gIot: gIot })}
        callAdd={() => {
          floatingAddRef.current.handleOpen();
        }}
        rowSelectable={(data, _idx) => {
          return data?.keyLevel !== 2;
        }}
        callRowClick={(index) => {
          navigateToDeviceDetail(ssmDevices[index]);
        }}
        callDelData={(items) => {
          gManageDevice.removeSesameDevices(items);
        }}
        btnCallKey={(choosedItems) => {
          navigateToDeviceShare(choosedItems.map((item) => item.deviceUUID).join(','));
        }}
        callSearch={(e) => {
          if (!e) {
            setSsmDevices(gManageDevice.filteredSsmDevices);
            return;
          }
          const result = gManageDevice.filteredSsmDevices.filter((item) => {
            return item.deviceName.includes(e);
          });
          setSsmDevices(result);
        }}
      />
    </SesameFloatingAdd>
  );
};

export default DeviceList;
