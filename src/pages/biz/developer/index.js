import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { Typography, TextField, Box, Button, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Refresh from '@mui/icons-material/Refresh';
import QrCodeIcon from '@mui/icons-material/QrCode';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import InfoIcon from '@mui/icons-material/Info';
import { gUtils } from '@/utils/gUtils';
import { biz3utils } from '@/utils/biz3utils';
import { useTranslation } from 'react-i18next';
import CheckTable from '@/components/biz/CheckTable';
import { gConfig } from '@constants/gConfig';
import WebhookCard from './WebhookCard';
import { roleLabel } from '@/utils/accessLabels';
import { PcPage, PcRow, PcSection, pcFieldSx } from '@/components/PcGrouped';
import { ios } from '@/theme/appHomeStyle';

export default function Developer() {
  const { t } = useTranslation(); // i18n
  const { gManageDevice, gManageGroup, gStripe, setModalContent, setCustomModalOpen, gDeveloper, setSnackbarValue } =
    useContext(GlobalStateContext);
  const [sesameKey, setSesameKey] = useState({ UUID: '', secretKey: '', deviceModel: '' });
  const [apiResponse, setApiResponse] = useState({});
  const [isKeyRefresing, setIsKeyRefresing] = useState(false);
  const [userDevices, setUserDevices] = useState([]);
  const fileInputRef = useRef(null);
  const [pending, setPending] = useState(false);

  const getApiInfo = useCallback(
    (isUpdate = false) => {
      gStripe.getDevApiInfo(isUpdate);
    },
    [gStripe]
  );

  useEffect(() => {
    const chooseDevices = gStripe.customerInfo.isSesameApp ? gManageDevice.companyDevices : gManageDevice.userDevices;
    const devices = chooseDevices.filter((item) => gUtils.isLockModel(item.deviceModel));
    setUserDevices(devices);
  }, [gManageDevice.userDevices, gManageDevice.companyDevices, gStripe.customerInfo.isSesameApp]);

  useEffect(() => {
    getApiInfo(false);
  }, [gStripe.customerInfo.companyID]);

  const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))({
    [`& .${tooltipClasses.tooltip}`]: {
      maxWidth: 500,
    },
  });

  const readQrcode = (imgFile) => {
    // 1) 解码图片得到二维码 URL（qrToken）
    biz3utils.readQrcodeUrl(imgFile, (err, qrUrl) => {
      if (!qrUrl) {
        setSnackbarValue({ open: true, msg: t('admin.developer.qrReadFailed') });
        return;
      }
      // 2) 先去服务端换取真正的二维码内容（对齐 app 的 redeem 流程）
      gManageGroup.redeemQRToken(qrUrl, (res) => {
        if (!res.success) {
          setSnackbarValue({
            logScope: 'pages/biz/developer/index.readQrcode',
            severity: 'error',
            open: true,
            msg: res.message,
          });
          return;
        }
        const redeemedUrl = res?.success ? res?.data : null;
        // 3) 从换取的内容解析设备信息
        const d = redeemedUrl ? biz3utils.parseDeviceKeyFromUrl(redeemedUrl) : null;
        if (!d) {
          setSnackbarValue({ open: true, msg: t('admin.developer.qrReadFailed') });
          return;
        }
        if (d.keyLevel !== 0) {
          setSnackbarValue({ open: true, msg: t('admin.developer.ownerRequired', { role: roleLabel(t, 'オーナー') }) });
          return;
        } else if (gUtils.isSesameAccessControlDevice(d.deviceModel)) {
          setSnackbarValue({ open: true, msg: t('admin.developer.deviceLimit') });
          return;
        } else {
          setSesameKey({ deviceUUID: d.deviceUUID, secretKey: d.secretKey, deviceModel: d.deviceModel });
        }
      });
    });
  };

  const handleOpenModal = async () => {
    setModalContent(
      <CheckTable
        title={t('admin.developer.selectDevice')}
        setOpenModal={setCustomModalOpen}
        enableFilter={false}
        selectableRows={'single'}
        handleClose={setCustomModalOpen(false)}
        data={userDevices}
        handleCheck={(selected) => {
          const is = selected[0];
          console.log('current select is', is);
          setCustomModalOpen(false);
          setApiResponse({});
          setSesameKey({ deviceUUID: is.deviceUUID, secretKey: is.secretKey, deviceModel: is.deviceModel });
        }}
      />
    );
    setCustomModalOpen(true);
  };

  const demoButtonSx = { minWidth: 'auto', px: '10px', color: ios.tint };

  if (!gStripe.customerInfo.tag) return null;

  return (
    <PcPage title={t('developer.ForDeveloper')}>
      <PcSection title="API">
        <PcRow label={t('admin.developer.apiKey')}>
          <Typography
            sx={{ fontSize: 15, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: ios.label }}
          >
            {gStripe.apiKey.apiKeyValue || ''}
          </Typography>
          <Tooltip title={t('admin.developer.copy')}>
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(gStripe.apiKey.apiKeyValue || '');
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('admin.developer.changeApiKey')}>
            <IconButton
              size="small"
              sx={{
                mr: '-6px',
                animation: isKeyRefresing ? 'rotate 1.5s linear infinite' : 'none',
                color: isKeyRefresing ? 'primary.main' : undefined,
                '@keyframes rotate': {
                  '0%': {
                    transform: 'rotate(0deg)',
                  },
                  '100%': {
                    transform: 'rotate(360deg)',
                  },
                },
              }}
              onClick={() => {
                setIsKeyRefresing(true);
                getApiInfo(true);
                setTimeout(() => {
                  setIsKeyRefresing(false);
                }, 1500);
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </PcRow>
        <PcRow
          label={t('admin.developer.monthlyApiUsage')}
          value={t('admin.developer.usageCount', { value: gStripe.apiKey.usedCount })}
        />
      </PcSection>
      {gStripe.isOwner && <WebhookCard />}
      <PcSection title={t('admin.developer.demo')}>
        <PcRow
          label={
            <>
              {t('admin.developer.step1')}
              <CustomWidthTooltip
                title={
                  <div>
                    {t('admin.developer.importQrHint')}
                    <br />
                    {t('admin.developer.importPersonalHint')}
                  </div>
                }
                placement="right-start"
              >
                <InfoIcon sx={{ fontSize: 18, color: ios.tertiaryLabel, cursor: 'pointer', ml: '6px' }} />
              </CustomWidthTooltip>
            </>
          }
        >
          <Button varient="text" component="label" startIcon={<QrCodeIcon />} sx={demoButtonSx}>
            {t('admin.developer.addByQr')}
            <input
              type="file"
              hidden
              ref={fileInputRef}
              onChange={(event) => {
                if (event.target.files[0]) {
                  readQrcode(event.target.files[0]);
                }
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            />
          </Button>
          <Button
            variant="text"
            startIcon={<SmartphoneIcon />}
            sx={{ ...demoButtonSx, mr: '-10px' }}
            onClick={() => {
              handleOpenModal();
            }}
          >
            {t('admin.developer.addFromPersonal')}
          </Button>
        </PcRow>
        <PcRow sx={{ py: '12px' }}>
          <TextField
            size="small"
            label={t('admin.developer.deviceUuid')}
            variant="filled"
            fullWidth
            sx={pcFieldSx}
            value={sesameKey.deviceUUID || ''}
            onChange={(e) => {
              setSesameKey({ ...sesameKey, deviceUUID: e.target.value });
            }}
          />
          <TextField
            size="small"
            label={t('admin.developer.deviceSecretKey')}
            variant="filled"
            fullWidth
            sx={pcFieldSx}
            value={sesameKey.secretKey || ''}
            onChange={(e) => {
              setSesameKey({ ...sesameKey, secretKey: e.target.value });
            }}
          />
        </PcRow>
        {sesameKey.deviceUUID && sesameKey.secretKey && (
          <>
            <PcRow label={t('admin.developer.step2')}>
              <Button
                sx={demoButtonSx}
                disabled={!sesameKey.deviceUUID}
                variant="text"
                onClick={() => {
                  setPending(true);
                  gDeveloper.getIoTDeviceState(sesameKey.deviceUUID, (res) => {
                    setApiResponse(res.data);
                    setPending(false);
                  });
                }}
              >
                {t('admin.developer.getStatus')}
              </Button>
              <Button
                sx={demoButtonSx}
                disabled={!sesameKey.deviceUUID}
                variant="text"
                onClick={() => {
                  setPending(true);
                  gDeveloper.getDeviceHistory(sesameKey.deviceUUID, (res) => {
                    setApiResponse(res.data);
                    setPending(false);
                  });
                }}
              >
                {t('admin.developer.getHistory')}
              </Button>
              <Button
                sx={{ ...demoButtonSx, mr: '-10px' }}
                disabled={!sesameKey.deviceUUID || !sesameKey.secretKey}
                variant="text"
                onClick={() => {
                  let cmd = 88;
                  if (sesameKey.deviceModel === gConfig.sesameDeviceModel.bot_2) {
                    cmd = 89;
                  } else if (sesameKey.deviceModel === gConfig.sesameDeviceModel.ssm_bike2) {
                    cmd = 83;
                  }
                  setPending(true);
                  gDeveloper.triggerDevice(
                    {
                      device_id: sesameKey.deviceUUID,
                      cmd,
                      sescretKey: sesameKey.secretKey,
                    },
                    (res) => {
                      setApiResponse(res.data);
                      setPending(false);
                    }
                  );
                }}
              >
                {t('admin.developer.operateDevice')}
              </Button>
            </PcRow>
            <PcRow sx={{ pb: '16px' }}>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  width: '100%',
                  height: 200,
                  overflow: 'auto',
                  p: '12px',
                  borderRadius: '10px',
                  bgcolor: ios.fill,
                  fontSize: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: ios.secondaryLabel,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  textAlign: 'left',
                }}
              >
                {pending ? '...' : JSON.stringify(apiResponse, null, 2)}
              </Box>
            </PcRow>
          </>
        )}
      </PcSection>
    </PcPage>
  );
}
