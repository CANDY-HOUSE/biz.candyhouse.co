import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import CheckTable from '@/components/biz/CheckTable';
import { styled } from '@mui/material/styles';
import { Card, CardHeader, Box, Typography, Button, CardContent, Collapse } from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import InfoIcon from '@mui/icons-material/Info';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import DataTable from '@/components/biz/device/DataTable';
import { DataTableColumns } from '@/components/biz/device/DataTableColumns';
import { biz3utils } from '@/utils/biz3utils';
import { useTranslation } from 'react-i18next';
import SesameFloatingAdd from '@/components/biz/device/SesameFloatingAdd';
import { useNavigateUtils } from '@/hooks/useNavigateUtils';

const SesameAccessControlDeviceIndex = () => {
  const { navigateToDeviceDetail } = useNavigateUtils();
  const { t } = useTranslation(); // i18n
  const [tableData, setTableData] = useState([]);
  const floatingAddRef = useRef(null);
  const { gManageDevice, setCustomModalOpen, setModalContent, setSnackbarValue, gMediaType } =
    useContext(GlobalStateContext);

  const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))({
    [`& .${tooltipClasses.tooltip}`]: {
      maxWidth: 500,
    },
  });

  useEffect(() => {
    console.log('当前设备', gManageDevice.filteredAccessControlDevices);
    setTableData(gManageDevice.filteredAccessControlDevices);
  }, [gManageDevice.filteredAccessControlDevices]);

  const handleClose = () => {
    setCustomModalOpen(false);
  };

  const handleOpenModal = async () => {
    setModalContent(
      <CheckTable
        loadingAble
        title={t('pages.sesameAccessControlDevice.index.SelectAuthenticationDevice')}
        setOpenModal={setCustomModalOpen}
        selectableRows={'multiple'}
        handleClose={handleClose}
        data={gManageDevice.canChoosedAccessControlDevices}
        handleCheck={handleCheck}
      />
    );
    setCustomModalOpen(true);
  };

  const handleCheck = (is, cb) => {
    gManageDevice.addSesameDevicesToBiz3(
      is,
      (res) => {
        setCustomModalOpen(false);
        cb && cb(res);
      },
      true
    );
  };

  const addAccessCtlComp = useMemo(() => {
    return (
      <Collapse in={true} timeout="auto" unmountOnExit sx={{ mt: 2 }}>
        <Card sx={{ paddingTop: '0px' }}>
          <CardHeader
            title={
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h2">新規デバイス(認証機器)を追加</Typography>
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
                      <br />
                      {`【${t('pages.sesameAccessControlDevice.index.PersonallyRegisteredDevices')}
                      】個人でセサミアプリに登録済みのデバイスをインポート`}
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
                      if (biz3utils.hasListObj(gManageDevice.filteredAccessControlDevices, [qrKeyInfo], 'deviceUUID')) {
                        setSnackbarValue({
                          open: true,
                          msg: '接続済みです',
                        });
                      } else {
                        gManageDevice.addSesameDevicesToBiz3([qrKeyInfo], null, true);
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
      </Collapse>
    );
  }, [
    t,
    setSnackbarValue,
    gManageDevice.filteredAccessControlDevices,
    gManageDevice.addSesameDevicesToBiz3,
    handleOpenModal,
  ]);

  return (
    <SesameFloatingAdd ref={floatingAddRef} isMobile={gMediaType.isMobile} popupComponent={addAccessCtlComp}>
      <DataTable
        isMobile={gMediaType.isMobile}
        data={tableData}
        isBind={false}
        isBack={false}
        rowHeight={'large'}
        columns={DataTableColumns.touchColumns({
          datas: tableData,
          listNames: gManageDevice.filteredSsmDevices,
        })}
        callDelData={(items) => {
          gManageDevice.removeSesameDevices(items);
        }}
        callAdd={() => {
          floatingAddRef.current.handleOpen();
        }}
        callRowClick={(index) => {
          navigateToDeviceDetail(tableData[index]);
        }}
        callSearch={(e) => {
          if (!e) {
            setTableData(gManageDevice.filteredAccessControlDevices);
          } else {
            const reuslt = gManageDevice.filteredAccessControlDevices.filter((item) => {
              const linkedDevices = (item.stateInfo?.sesameDevices || []).map((lm) => {
                return gManageDevice.filteredSsmDevices.find((ssm) => ssm.deviceUUID === lm);
              });
              return item.deviceName.includes(e) || linkedDevices.some((ld) => ld?.deviceName?.includes(e));
            });
            setTableData(reuslt);
          }
        }}
      />
    </SesameFloatingAdd>
  );
};

export default SesameAccessControlDeviceIndex;
