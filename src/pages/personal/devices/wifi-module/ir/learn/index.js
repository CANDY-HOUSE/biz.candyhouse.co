import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Popover,
} from '@mui/material';
import {
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  Delete as DeleteIcon,
  SignalWifiConnectedNoInternet4Rounded,
  MoreHoriz,
} from '@mui/icons-material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import irMatchImage from '@/assets/svg/ir/png_ir_match.png';
import EditableText from '@/components/EditableText.js';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils.js';

const RemoteLearn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gAuth, gStripe, setSnackbarValue, gMediaType } = useContext(GlobalStateContext);

  // 使用 useRemoteCtrl Hook
  const {
    getIRCodes,
    getIRMode,
    setIRMode,
    subscribeIRMode,
    subscribeIRData,
    addIRCode,
    updateIRCode,
    deleteIRCode,
    sendIR,
    addIRRemote,
    modifyIRRemote,
    updateLocalRemoteList,
  } = useRemoteCtrl(gAuth, gStripe, setSnackbarValue);

  // 状态管理
  const [hub3DeviceId, setHub3DeviceId] = useState('');
  const [remote, setRemote] = useState(null);
  const [irCodes, setIrCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isLearnMode, setIsLearnMode] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isRemoteSaved, setIsRemoteSaved] = useState(false);
  const [shouldHideToggleButton, setShouldHideToggleButton] = useState(false);
  const { t } = useTranslation();

  const isMobile = gMediaType.isMobile;

  // 对话框状态
  const [editDialog, setEditDialog] = useState({
    open: false,
    irCode: null,
    name: '',
  });

  // 菜单状态
  const [menuState, setMenuState] = useState({
    anchorEl: null,
    irCode: null,
  });

  // 常量定义
  const IR_MODE = {
    CONTROL: 0,
    LEARN: 1,
  };

  // 从路由参数获取数据
  useEffect(() => {
    const hub3DeviceIdParam = searchParams.get('hub3DeviceId');
    const remoteParam = searchParams.get('remote');
    const fromType = searchParams.get('fromType');

    // 判断是否应该隐藏模式切换按钮
    // 当从 App 打开且为第一级页面时隐藏，避免用户在学习模式下退出导致模式未恢复
    const isFromApp = fromType === 'app' || gStripe.isFromApp;
    const isFirstLevel = window.history.length < 2;
    setShouldHideToggleButton(isFromApp && isFirstLevel);

    if (!hub3DeviceIdParam) {
      console.error('hub3DeviceId 参数缺失');
      setSnackbarValue({
        open: true,
        msg: 'hub3DeviceId 参数缺失',
        severity: 'error',
      });
      navigate(-1);
      return;
    }

    setHub3DeviceId(hub3DeviceIdParam);

    // 初始化遥控器对象
    let initialRemote;
    if (remoteParam) {
      try {
        initialRemote = JSON.parse(remoteParam);
        setIsRemoteSaved(true);
      } catch (error) {
        console.error('get remote error!', error);
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.invalidRemoteParam'),
          severity: 'error',
        });
      }
    }

    if (!initialRemote) {
      // 创建默认的学习遥控器
      initialRemote = {
        model: 'Learn',
        alias: t('pages.ir.remote.learn'),
        uuid: undefined,
        state: '',
        timestamp: Date.now(),
        type: 0xfe00,
        code: 0,
        direction: '',
      };
      setIsRemoteSaved(false);
    }

    setRemote(initialRemote);
  }, []);

  // 设置IR模式
  const setMode = useCallback(
    (mode) => {
      console.log('set IR mode:', mode);
      setIRMode(hub3DeviceId, mode, (response) => {
        if (!response.success) {
          console.error('set IR mode error:', response.message);
          setSnackbarValue({
            open: true,
            msg: t('pages.ir.remote.setIRModeFail'),
            severity: 'error',
          });
        }
      });
    },
    [hub3DeviceId, setIRMode, setSnackbarValue]
  );

  // 获取当前IR模式
  const getCurrentIRMode = useCallback(() => {
    getIRMode(hub3DeviceId, (response) => {
      console.info('get current IR mode response:', response);
      if (response.success) {
        try {
          let mode;
          if (response.data && typeof response.data === 'object') {
            mode = response.data.ir_mode || response.data.mode;
          } else if (typeof response.data === 'number') {
            mode = response.data;
          }

          if (mode !== undefined) {
            console.log('current IR mode:', mode);
            setIsLearnMode(mode === IR_MODE.LEARN);
          }
        } catch (error) {
          console.error('parse IR mode data failed:', error);
        }
      } else {
        console.error('get IR mode failed:', response.message);
      }
    });
  }, [hub3DeviceId, getIRMode, setMode]);

  // 订阅IR模式变化
  const subscribeIRModeChanges = useCallback(() => {
    subscribeIRMode(hub3DeviceId, (response) => {
      console.log('receive IR mode notify:', response);
      if (response.success) {
        try {
          let mode = response.data.data.ir_mode;
          console.log('receive IR mode:', mode);
          setIsLearnMode(mode === IR_MODE.LEARN);
        } catch (error) {
          console.error('parse IR mode data failed:', error);
        }
      } else {
        console.error('subscribe IR mode failed:', response.message);
        setIsConnected(false);
      }
    });
  }, [hub3DeviceId, subscribeIRMode]);

  // 订阅学习数据
  const subscribeIRDataChanges = useCallback(() => {
    subscribeIRData(hub3DeviceId, (response) => {
      if (response.success) {
        console.log('receive learn data, size:', response.data.data ? response.data.data.length : 0);

        // 创建新的红外按键
        const newIrCode = {
          keyUUID: biz3utils.generateUUID(),
          name: '',
          uuid: remote.uuid,
          deviceId: hub3DeviceId,
          data: response.data.data,
        };

        // 先保存到服务器，成功后再添加到本地状态
        addIRCode(newIrCode, (addResponse) => {
          if (addResponse.success) {
            // 只有保存成功后才添加到本地状态
            setIrCodes((prev) => [...prev, newIrCode]);
          } else {
            console.error('add IR code failed:', addResponse.message);
            setSnackbarValue({
              open: true,
              msg: t('pages.ir.remote.addIRCodeFail'),
              severity: 'error',
            });
          }
          exitLearnMode();
        });
      } else {
        console.error('subscribe learn data failed:', response.message);
        setIsConnected(false);
        exitLearnMode();
      }
    });
  }, [hub3DeviceId, subscribeIRData, irCodes.length, remote, addIRCode, setSnackbarValue]);

  // 保存遥控器到服务器（首次保存整个遥控器）
  const saveRemoteToServer = useCallback(() => {
    console.log('save remote to server:', remote, isRemoteSaved);
    if (!remote || isRemoteSaved) {
      return;
    }

    console.log('save self-learning remote to server for the first time:', remote);
    const remoteToSave = {
      uuid: biz3utils.generateUUID(),
      model: remote.model,
      state: '',
      alias: remote.alias,
      code: remote.code,
      type: remote.type,
      deviceUUID: hub3DeviceId,
      keys: [],
    };
    addIRRemote(remoteToSave, (response) => {
      if (response.success) {
        setIsLoading(false);
        console.log('remote saved successfully:', response.data);
        remote.uuid = remoteToSave.uuid;
        setIsRemoteSaved(true);
        updateLocalRemoteList(hub3DeviceId, remoteToSave);
      } else {
        console.error('save remote to server failed:', response.message);
        setSnackbarValue({
          open: true,
          msg: t(response.message || 'pages.ir.remote.addIRRemoteFail'),
          severity: 'error',
        });
      }
    });
  }, [hub3DeviceId, remote, isRemoteSaved, addIRRemote]);

  // 进入学习模式
  const enterLearnMode = useCallback(() => {
    setMode(IR_MODE.LEARN);
  }, [setMode]);

  // 退出学习模式
  const exitLearnMode = useCallback(() => {
    setMode(IR_MODE.CONTROL);
  }, [setMode]);

  // 切换自学习模式
  const toggleLearnMode = useCallback(() => {
    if (isLearnMode) {
      exitLearnMode();
    } else {
      enterLearnMode();
    }
  }, [isLearnMode, enterLearnMode, exitLearnMode]);

  // 发送红外信号
  const handleEmitIRCode = useCallback(
    (irCode) => {
      console.info('send IR code:', irCode);
      if (isLearnMode) {
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.cannotSendInLearnMode'),
          severity: 'warning',
        });
        return;
      }
      sendIR(hub3DeviceId, irCode.uuid, irCode.keyUUID, 'learnEmit', remote.type, (response) => {
        if (response.success) {
          setSnackbarValue({
            open: true,
            msg: t('pages.ir.remote.sendSuccess'),
            severity: 'success',
          });
        } else {
          setSnackbarValue({
            open: true,
            msg: t('pages.ir.remote.sendFail'),
            severity: 'error',
          });
        }
      });
    },
    [hub3DeviceId, remote, isLearnMode]
  );

  // 处理菜单按钮点击
  const handleMenuClick = useCallback((e, irCode) => {
    e.preventDefault();
    e.stopPropagation();

    setMenuState({
      anchorEl: e.currentTarget,
      irCode: irCode,
    });
  }, []);

  // 打开编辑对话框
  const handleEditIRCode = (irCode) => {
    setEditDialog({
      open: true,
      irCode: irCode,
      name: irCode.name,
    });
    setMenuState({ anchorEl: null, irCode: null });
  };

  // 关闭编辑对话框
  const handleCloseEditDialog = () => {
    setEditDialog({
      open: false,
      irCode: null,
      name: '',
    });
  };

  // 保存按键名称
  const handleSaveIRCodeName = () => {
    const { irCode, name } = editDialog;
    console.info('save IR code name:', name, 'remote:', irCode);
    handleCloseEditDialog();
    if (!name.trim()) {
      setSnackbarValue({
        open: true,
        msg: t('pages.ir.remote.nameCannotBeEmpty'),
        severity: 'warning',
      });
      return;
    }

    updateIRCode(hub3DeviceId, irCode.uuid, irCode.keyUUID, name.trim(), (response) => {
      if (response.success) {
        // 更新本地状态
        setIrCodes((prev) =>
          prev.map((code) => (code.keyUUID === irCode.keyUUID ? { ...code, name: name.trim() } : code))
        );
      } else {
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.updateIRCodeFail'),
          severity: 'error',
        });
      }
    });
  };

  // 删除按键
  const handleDeleteIRCode = (irCode) => {
    setMenuState({ anchorEl: null, irCode: null });

    deleteIRCode(hub3DeviceId, irCode.uuid, irCode.keyUUID, (response) => {
      if (response.success) {
        // 更新本地状态
        setIrCodes((prev) => prev.filter((code) => code.keyUUID !== irCode.keyUUID));
      } else {
        setSnackbarValue({
          open: true,
          msg: t('pages.ir.remote.deleteIRCodeFail'),
          severity: 'error',
        });
      }
    });
  };

  // 关闭菜单
  const handleCloseMenu = () => {
    setMenuState({ anchorEl: null, irCode: null });
  };

  // 重新加载数据
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    console.log('reloading data...');

    if (hub3DeviceId && remote) {
      // 1. 保存遥控器（如果未保存）
      if (!isRemoteSaved) {
        saveRemoteToServer();
        return;
      }

      // 2. 获取按键列表
      getIRCodes(hub3DeviceId, remote.uuid, (response) => {
        setIsLoading(false);

        if (response.success) {
          const keys = response.data || [];
          setIrCodes(
            keys.map((key) => ({
              ...key,
              name: key.name,
            }))
          );
        } else {
          console.error('failed to get IR code list:', response.message);
          setIsError(true);
        }
      });
    }
  }, [hub3DeviceId, remote, saveRemoteToServer, getIRCodes]);

  // 初始化
  useEffect(() => {
    console.log('initializing data load...');
    if (hub3DeviceId && remote) {
      subscribeIRModeChanges();
      subscribeIRDataChanges();
      getCurrentIRMode();
      handleRefresh();
    }

    // 清理函数
    return () => {
      setMode(IR_MODE.CONTROL);
    };
  }, [hub3DeviceId, remote]);

  // 处理修改
  const handleModify = (newValue, onComplete) => {
    try {
      if (!remote.uuid || remote.uuid.trim() === '') {
        onComplete(true);
        return;
      }

      console.log('modify remote :', hub3DeviceId, remote.uuid, newValue);

      modifyIRRemote(hub3DeviceId, remote.uuid, newValue, (response) => {
        console.log('modifyIRRemote callback response:', response);

        if (response.success) {
          onComplete(true);
          console.log('remote modified successfully:', response.data);
          remote.alias = newValue;
          updateLocalRemoteList(hub3DeviceId, { ...remote, alias: newValue });
        } else {
          onComplete(false);
          console.error('remote modification failed:', response.message);
          setSnackbarValue({
            open: true,
            msg: t('pages.ir.remote.updateIRRemoteFail'),
            severity: 'error',
          });
        }
      });
    } catch (error) {
      console.error('handleModify error:', error);
      setSnackbarValue({
        open: true,
        msg: t('pages.ir.remote.updateIRRemoteFail'),
        severity: 'error',
      });
    }
  };

  const renderIRCodeGrid = () => {
    const gridRows = Math.ceil(irCodes.length / 3);

    return (
      <Box sx={{ px: 1, padding: 0, marginBottom: 10 }} data-ir-grid="true">
        <Grid container spacing={0}>
          {Array.from({ length: gridRows }, (_, row) => (
            <Grid item xs={12} key={row}>
              <Grid container>
                {[0, 1, 2].map((col) => {
                  const index = row * 3 + col;
                  const irCode = irCodes[index];

                  if (!irCode) {
                    return (
                      <Grid item xs={4} key={`${row}-${col}`}>
                        <Paper
                          elevation={0}
                          sx={{
                            height: 140,
                            borderRight: 'none',
                            borderBottom: 'none',
                          }}
                        />
                      </Grid>
                    );
                  }

                  const showRightBorder = col < 2;
                  const showBottomBorder = row < gridRows - 1;

                  return (
                    <Grid item xs={4} key={irCode.keyUUID}>
                      <Paper
                        elevation={0}
                        sx={{
                          height: 140,
                          backgroundColor: 'background.paper',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          borderRight: showRightBorder ? '1px solid' : 'none',
                          borderBottom: showBottomBorder ? '1px solid' : 'none',
                          borderColor: 'divider',
                          borderRadius: 0,
                          transition: 'opacity 0.2s, background-color 0.2s',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          WebkitUserDrag: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                          '&:active': {
                            opacity: 0.3,
                          },
                        }}
                        onClick={() => handleEmitIRCode(irCode)}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            lineHeight: 1.2,
                            fontWeight: 'normal',
                            wordBreak: 'break-word',
                            mb: 0.5,
                            pointerEvents: 'none',
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {irCode.name || t('pages.ir.remote.mobileDefaultKeyName')}
                        </Typography>

                        <Box
                          onClick={(e) => handleMenuClick(e, irCode)}
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.08)',
                              transform: 'scale(1.1)',
                              '& .menu-icon': {
                                transform: 'scale(1.2)',
                              },
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                              backgroundColor: 'rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <MoreHoriz
                            className="menu-icon"
                            sx={{
                              fontSize: '18px',
                              color: 'text.secondary',
                              transition: 'all 0.2s ease-in-out',
                            }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // 如果正在加载
  if (isLoading) {
    return (
      <Card sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!isMobile && (
                <IconButton onClick={() => navigate(-1)}>
                  <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
                </IconButton>
              )}

              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  lineHeight: '1.3',
                  ml: 1,
                }}
              >
                {remote?.alias}
              </Typography>
            </Box>
          }
        />
        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 如果有错误
  if (isError) {
    return (
      <Card sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!isMobile && (
                <IconButton onClick={() => navigate(-1)}>
                  <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
                </IconButton>
              )}

              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  lineHeight: '1.3',
                  ml: 1,
                }}
              >
                {remote?.alias}
              </Typography>
            </Box>
          }
        />
        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleRefresh}>
              <SignalWifiConnectedNoInternet4Rounded sx={{ fontSize: 60 }} />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {t('pages.ir.remote.networkIssuePleaseRetry')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 正常界面
  return (
    <>
      <Card
        sx={{
          height: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          margin: 0,
          '& .MuiCardContent-root': {
            padding: 0,
          },
        }}
      >
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {!isMobile && (
                  <IconButton onClick={() => navigate(-1)}>
                    <KeyboardArrowLeftIcon sx={{ ml: -1 }} />
                  </IconButton>
                )}

                <EditableText
                  style={{
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    lineHeight: '1.3',
                  }}
                  initialValue={remote.alias}
                  onSave={(newValue, callback) => {
                    if (!newValue || !callback) {
                      return;
                    }
                    handleModify(newValue, (success) => {
                      callback(success);
                    });
                  }}
                />
              </Box>

              {!shouldHideToggleButton && (
                <IconButton onClick={toggleLearnMode}>
                  {isLearnMode ? <HighlightOffRoundedIcon /> : <AddCircleOutlineOutlinedIcon />}
                </IconButton>
              )}
            </Box>
          }
          sx={{
            pb: 1,
            paddingLeft: '10px',
          }}
        />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              flex: 1,
              pt: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100vh',
              width: '100%',
              padding: 0,
              margin: 0,
              maxWidth: 1080,
            }}
          >
            {/* 连接错误提示 */}
            {!isConnected && (
              <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                {t('pages.ir.remote.networkError')}
              </Alert>
            )}

            {/* 内容区域 */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {irCodes.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    gap: 3,
                    p: 4,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box
                      component="img"
                      src={irMatchImage}
                      alt="IR Auto Match Introduction"
                      sx={{
                        width: '100%',
                        height: 150,
                        maxWidth: 300,
                        objectFit: 'contain',
                      }}
                    />
                  </Box>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ mb: 1, fontSize: '1.2rem' }}>
                      {t('pages.ir.remote.learnInstruction')}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                renderIRCodeGrid()
              )}
            </Box>
          </CardContent>
        </Box>
      </Card>

      {/* 按键菜单 */}
      <Popover
        anchorEl={menuState.anchorEl}
        open={Boolean(menuState.anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            minWidth: 120,
            boxShadow: 3,
          },
        }}
      >
        <MenuItem onClick={() => handleEditIRCode(menuState.irCode)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          {t('pages.ir.remote.edit')}
        </MenuItem>
        <MenuItem onClick={() => handleDeleteIRCode(menuState.irCode)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          {t('pages.ir.remote.delete')}
        </MenuItem>
      </Popover>

      {/* 编辑对话框 */}
      <Dialog open={editDialog.open} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('pages.ir.remote.edit')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            variant="outlined"
            value={editDialog.name}
            onChange={(e) => setEditDialog((prev) => ({ ...prev, name: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveIRCodeName();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t('pages.ir.remote.cancel')}</Button>
          <Button onClick={handleSaveIRCodeName} variant="contained">
            {t('pages.ir.remote.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RemoteLearn;
