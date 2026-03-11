import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import {
  Typography,
  TextField,
  Card,
  CardHeader,
  CardContent,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Refresh from '@mui/icons-material/Refresh';
import QrCodeIcon from '@mui/icons-material/QrCode';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import InfoIcon from '@mui/icons-material/Info';
import { gUtils } from '@/utils/gUtils';
import { biz3utils } from '@/utils/biz3utils';
import { useTranslation } from 'react-i18next';
import CheckTable from '@/components/biz/CheckTable';
import DataTable from '@/components/biz/device/DataTable';
import { gConfig } from '@constants/gConfig';

export default function Developer() {
  const { t } = useTranslation(); // i18n
  const { gManageDevice, gStripe, setModalContent, setCustomModalOpen, gDeveloper, setSnackbarValue, gMediaType } =
    useContext(GlobalStateContext);
  const [sesameKey, setSesameKey] = useState({ UUID: '', secretKey: '', deviceModel: '' });
  const [apiResponse, setApiResponse] = useState({});
  const [isKeyRefresing, setIsKeyRefresing] = useState(false);
  const [selectAnchorEl, setSelectAnchorEl] = useState({ anchorEl: null, selectIndex: null });
  const [userDevices, setUserDevices] = useState([]);
  const fileInputRef = useRef(null);
  const [pending, setPending] = useState(false);

  const getApiInfo = useCallback(
    (isUpdate = false) => {
      gStripe.getDevApiInfo(isUpdate);
    },
    [gStripe.customerInfo.subscriptionId]
  );

  useEffect(() => {
    const devices = gManageDevice.userDevices.filter((item) => gUtils.isLockModel(item.deviceModel));
    setUserDevices(devices);
  }, gManageDevice.userDevices);

  useEffect(() => {
    getApiInfo(false);
    if (gDeveloper.firmwares.length < 1) {
      gDeveloper.getDownloadFireware();
    }
  }, [gStripe.customerInfo.companyID]);

  const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))({
    [`& .${tooltipClasses.tooltip}`]: {
      maxWidth: 500,
    },
  });

  const infoItem = {
    display: 'flex',
    alignItems: 'center',
  };

  const readQrcode = (imgUrl) => {
    biz3utils.readQrcode(imgUrl, (e, d) => {
      if (d) {
        if (d.keyLevel !== 0) {
          setSnackbarValue({ open: true, msg: '登録失敗、デバイスの"オーナー"権限が必要です' });
          return;
        } else if (gUtils.isSesameAccessControlDevice(d.deviceModel)) {
          setSnackbarValue({ open: true, msg: 'デバイス数の上限に達しました。プランのアップグレードが必要です。' });
          return;
        } else {
          setSesameKey({ deviceUUID: d.deviceUUID, secretKey: d.secretKey, deviceModel: d.deviceModel });
        }
      }
    });
  };

  const paperStyles = {
    height: '10em',
    overflow: 'auto', // 文字數超過minHeigh的話顯示scrollbar
    padding: '8px',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#999',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap', // 保留空白符和换行符
    overflowX: 'auto', // 如果内容过宽，添加滚动条
    border: '1px solid #F1F1F1',
  };

  const columns = [
    {
      name: 'デバイス名',
      label: 'デバイス名',
      options: {
        customBodyRenderLite: (dataIndex) => {
          return gDeveloper.firmwares[dataIndex].device;
        },
      },
    },
    {
      name: 'バージョン',
      label: 'バージョン',
      options: {
        customBodyRenderLite: (dataIndex) => {
          return (
            <>
              <Typography
                href="#"
                sx={{
                  color: '#000000',
                  textDecoration: 'none', // 默认没有下划线
                  '&:hover': {
                    textDecoration: 'underline', // 鼠标悬停时显示下划线
                  },
                  cursor: 'pointer', // 鼠标悬停时显示指针样式
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectAnchorEl({ anchorEl: e.currentTarget, selectIndex: dataIndex });
                }}
              >
                {gDeveloper.firmwares[dataIndex].v}
              </Typography>
              <Menu
                elevation={1}
                sx={{
                  '& .MuiPaper-root': {
                    border: '1px solid #F1F1F1',
                  },
                }}
                MenuListProps={{ disablePadding: true }}
                keepMounted
                anchorEl={selectAnchorEl.anchorEl}
                open={Boolean(selectAnchorEl.anchorEl)}
                onClose={() => setSelectAnchorEl({ anchorEl: null, selectIndex: null })}
              >
                <MenuItem
                  onClick={() => {
                    const url = gDeveloper.firmwares[selectAnchorEl.selectIndex].downloadUrl;
                    url && (window.location.href = url);
                  }}
                >
                  <ListItemText primary="ダウンロード" />
                </MenuItem>
              </Menu>
            </>
          );
        },
      },
    },
  ];

  const handleOpenModal = async () => {
    setModalContent(
      <CheckTable
        title={'デバイスを選択'}
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

  return (
    <>
      {gStripe.customerInfo.tag && (
        <Card sx={{ p: 0 }}>
          <CardHeader
            title={
              <Typography variant="h2" sx={{ p: '16px', pb: 0 }}>
                {t('developer.ForDeveloper')}
              </Typography>
            }
          />
          <CardContent
            sx={{
              mt: 2,
              p: '0px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Card>
                <CardHeader title={<Typography variant="h3">APIキー</Typography>} />
                <CardContent>
                  <Box
                    className="currentPlan"
                    sx={{
                      ...infoItem,
                      flexWrap: 'wrap',
                      wordBreak: 'break-all',
                      gap: '6px',
                    }}
                  >
                    <Typography>{gStripe.apiKey.apiKeyValue || ''}</Typography>
                    <Tooltip title="コピー">
                      <IconButton
                        size="small"
                        sx={{ marginLeft: '6px' }}
                        onClick={() => {
                          navigator.clipboard.writeText(gStripe.apiKey.apiKeyValue || '');
                        }}
                      >
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="APIキーの変更">
                      <IconButton
                        size="small"
                        sx={{
                          animation: isKeyRefresing ? 'rotate 1.5s linear infinite' : 'none',
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
                        <Refresh fontSize="medium" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardHeader
                  title={
                    <Typography
                      variant="h3"
                      sx={{
                        // color: "#8a8994",
                        display: 'inline-block',
                      }}
                    >
                      今月のAPIご利用回数
                    </Typography>
                  }
                />
                <CardContent>
                  <Box sx={{ ...infoItem }}>
                    <Typography>{`${gStripe.apiKey.usedCount} 回`}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
            <Card>
              <CardHeader title={<Typography variant="h3">デモ</Typography>} />
              <CardContent>
                <Box sx={{ ...infoItem, paddingTop: '6px' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'normal' }}>
                    1.デバイスを選択
                  </Typography>
                  <CustomWidthTooltip
                    title={
                      <div>
                        【QRコード】QRコードからデバイスをインポート
                        <br />
                        【個人で登録済のデバイス】個人でセサミアプリに登録済みのデバイスをインポート
                      </div>
                    }
                    placement="right-start"
                  >
                    <InfoIcon sx={{ color: '#cccccc', cursor: 'pointer', ml: '5px' }} />
                  </CustomWidthTooltip>
                </Box>
                <Box sx={{ display: 'flex', paddingTop: '6px' }}>
                  <Button varient="text" component="label" startIcon={<QrCodeIcon />}>
                    QRコードで追加
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
                    onClick={() => {
                      handleOpenModal();
                    }}
                  >
                    個人で登録済のデバイスから追加
                  </Button>
                </Box>
              </CardContent>
              <CardContent sx={{ paddingBottom: 'unset' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <TextField
                    size="small"
                    label="デバイスUUID"
                    variant="filled"
                    sx={{ marginBottom: '10px', flexGrow: '1' }}
                    fullWidth
                    value={sesameKey.deviceUUID || ''}
                    onChange={(e) => {
                      setSesameKey({ ...sesameKey, deviceUUID: e.target.value });
                    }}
                  />
                  <TextField
                    size="small"
                    label="デバイスシークレットキー"
                    variant="filled"
                    fullWidth
                    value={sesameKey.secretKey || ''}
                    onChange={(e) => {
                      setSesameKey({ ...sesameKey, secretKey: e.target.value });
                    }}
                    sx={{
                      marginBottom: '10px',
                      marginLeft: '10px',
                      flexGrow: '1',
                    }}
                  />
                </Box>
              </CardContent>

              {sesameKey.deviceUUID && sesameKey.secretKey && (
                <>
                  <CardContent>
                    <Typography variant="h3" sx={{ fontWeight: 'normal', paddingTop: '8px' }}>
                      2.デモを実行する
                    </Typography>

                    <Box sx={{ display: 'flex', marginTop: '6px' }}>
                      <Button
                        sx={{ marginRight: '10px', color: '#28aeb1' }}
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
                        ステータス取得
                      </Button>
                      <Button
                        sx={{ marginRight: '10px', color: '#28aeb1' }}
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
                        履歴取得
                      </Button>
                      <Button
                        sx={{ marginRight: '10px', color: '#28aeb1' }}
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
                        デバイス操作
                      </Button>
                    </Box>
                  </CardContent>
                  <Paper style={paperStyles} variant="outlined">
                    {pending ? '...' : JSON.stringify(apiResponse, null, 2)}
                  </Paper>
                </>
              )}
            </Card>
            <DataTable
              isMobile={gMediaType.isMobile}
              isAdd={false}
              data={gDeveloper.firmwares}
              isBind={false}
              isDel={false}
              isCsv={false}
              isBack={false}
              selectableRows={'none'}
              text={`最新ファームウェア ダウンロード一覧`}
              columns={columns}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
