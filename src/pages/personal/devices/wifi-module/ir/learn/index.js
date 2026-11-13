import PageHeader, { pageHeaderTitleStyle } from '@/components/PageHeader';
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Card, CardContent, Box, Typography, IconButton, Paper, Alert, CircularProgress } from '@mui/material';
import { SignalWifiConnectedNoInternet4Rounded } from '@mui/icons-material';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import irMatchImage from '@/assets/svg/ir/png_ir_match.png';
import EditableText from '@/components/EditableText.js';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils.js';
import SortableKeyGrid from '../components/SortableKeyGrid.js';
import { useKeyOrder } from '../hooks/useKeyOrder.js';
import { useRemotePageFrame } from '../hooks/useRemotePageFrame.js';
import { useRemoteKeys } from '../hooks/useRemoteKeys.js';
import { useIrLearning } from '../hooks/useIrLearning.js';
import { useKeyEditMenu } from '../components/KeyEditMenu.js';
import LearnKeyCell from '../components/LearnKeyCell.js';
import KeyHints from '../components/KeyHints.js';
import { mergeRemoteKeys } from '../utils/remoteKeys.js';

const RemoteLearn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);

  // 使用 useRemoteCtrl Hook
  const remoteCtrl = useRemoteCtrl(gAuth, gStripe, setSnackbarValue);
  const { sendIR, addIRRemote, modifyIRRemote, updateLocalRemoteList, setRemoteKeyOrder, getRemoteKeyOrder } =
    remoteCtrl;

  // 状态管理
  const [hub3DeviceId, setHub3DeviceId] = useState('');
  const [remote, setRemote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isRemoteSaved, setIsRemoteSaved] = useState(false);
  const [shouldHideToggleButton, setShouldHideToggleButton] = useState(false);
  const { t } = useTranslation();

  const { showBack, goBack, frameSx, scrollSx } = useRemotePageFrame();

  const showError = useCallback(
    (key) => setSnackbarValue({ open: true, msg: t(key), severity: 'error', logReason: key }),
    [setSnackbarValue, t]
  );

  // 按键记录（自学习遥控器全是学习按键，本来就是全量的，没有面板），由 ir_device_key 读写；进入页面时和顺序一起取（handleRefresh）
  const savedUuid = isRemoteSaved && remote?.uuid ? remote.uuid : '';
  const { rows, setRows, renameKey, deleteKey, addLearnedRow } = useRemoteKeys({
    remote,
    hub3DeviceId,
    savedUuid,
    panelItems: [],
    api: remoteCtrl,
    autoLoad: false,
  });
  const irCodes = useMemo(() => mergeRemoteKeys([], rows, true, t('pages.ir.remote.mobileDefaultKeyName')), [rows, t]);

  // 学习模式：学到的按键追加到最后
  const { isLearnMode, isConnected, toggleLearnMode } = useIrLearning({
    hub3DeviceId,
    remoteUuid: remote?.uuid,
    enabled: !!hub3DeviceId && !!remote,
    api: remoteCtrl,
    onLearned: addLearnedRow,
    onError: showError,
  });

  // 按键排序：按键 id 就是 keyUUID，默认顺序是后台返回的录入先后。
  // 顺序和按键列表在同一次刷新里一起取（serverKeyOrder），不用首页列表里可能过期的那份。
  const [serverKeyOrder, setServerKeyOrder] = useState(undefined);
  const defaultKeyIds = useMemo(() => irCodes.map((item) => item.id), [irCodes]);
  const { orderedIds, handleReorder, removeKey } = useKeyOrder({
    remote,
    savedUuid: isRemoteSaved && remote?.uuid ? remote.uuid : '',
    defaultIds: defaultKeyIds,
    serverOrder: serverKeyOrder,
    persist: (uuid, keyOrder) => setRemoteKeyOrder(hub3DeviceId, uuid, keyOrder),
    onPersisted: (keyOrder) => updateLocalRemoteList(hub3DeviceId, { ...remote, keyOrder }),
  });
  // 能学习（自学习页隐藏学习入口时不显示学习格）
  const canLearn = !shouldHideToggleButton;
  const orderedIrCodes = useMemo(
    () => orderedIds.map((id) => irCodes.find((item) => item.id === id)).filter(Boolean),
    [orderedIds, irCodes]
  );

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
        logScope: 'pages/personal/devices/wifi-module/ir/learn/index.RemoteLearn',
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
          logScope: 'pages/personal/devices/wifi-module/ir/learn/index.RemoteLearn',
          logReason: 'pages.ir.remote.invalidRemoteParam',
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
          logScope: 'pages/personal/devices/wifi-module/ir/learn/index.saveRemoteToServer',
          open: true,
          msg: t(response.message || 'pages.ir.remote.addIRRemoteFail'),
          severity: 'error',
        });
      }
    });
  }, [hub3DeviceId, remote, isRemoteSaved, addIRRemote]);

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
            logScope: 'pages/personal/devices/wifi-module/ir/learn/index.handleEmitIRCode',
            logReason: 'pages.ir.remote.sendFail',
            open: true,
            msg: t('pages.ir.remote.sendFail'),
            severity: 'error',
          });
        }
      });
    },
    [hub3DeviceId, remote, isLearnMode]
  );

  // 按键的「…」菜单：编辑名称、删除
  const { openMenu, menuElement } = useKeyEditMenu({
    getName: (item) => item.customName || '',
    isNameTaken: (item, name) => orderedIrCodes.some((other) => other.id !== item.id && other.title === name),
    onRename: (item, name) =>
      renameKey(item, name, (success) => {
        if (!success) showError('pages.ir.remote.updateIRCodeFail');
      }),
    onDelete: (item) =>
      deleteKey(item, (success) => {
        if (success) removeKey(item.id);
        else showError('pages.ir.remote.deleteIRCodeFail');
      }),
  });

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
      remoteCtrl.getRemoteKeys(hub3DeviceId, remote.uuid, (response) => {
        if (!response.success) {
          setIsLoading(false);
          console.error('failed to get IR code list:', response.message);
          setIsError(true);
          return;
        }
        const keys = response.data?.keys || [];
        // 再取一次最新的按键顺序，两者一起显示，避免先按默认顺序显示再跳动；取不到就用列表里带的顺序
        getRemoteKeyOrder(hub3DeviceId, remote.uuid, (orderResponse) => {
          if (orderResponse.success) {
            setServerKeyOrder(orderResponse.data?.keyOrder || []);
          }
          setRows(keys);
          setIsLoading(false);
        });
      });
    }
  }, [hub3DeviceId, remote, saveRemoteToServer, remoteCtrl, getRemoteKeyOrder, setRows]);

  // 初始化
  useEffect(() => {
    console.log('initializing data load...');
    if (hub3DeviceId && remote) {
      handleRefresh();
    }
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
            logScope: 'pages/personal/devices/wifi-module/ir/learn/index.handleModify',
            logReason: 'pages.ir.remote.updateIRRemoteFail',
            open: true,
            msg: t('pages.ir.remote.updateIRRemoteFail'),
            severity: 'error',
          });
        }
      });
    } catch (error) {
      console.error('handleModify error:', error);
      setSnackbarValue({
        logScope: 'pages/personal/devices/wifi-module/ir/learn/index.handleModify',
        logReason: 'pages.ir.remote.updateIRRemoteFail',
        open: true,
        msg: t('pages.ir.remote.updateIRRemoteFail'),
        severity: 'error',
      });
    }
  };

  const renderIRCodeGrid = () => (
    <Box sx={{ px: 1, padding: 0, pb: 2 }} data-ir-grid="true">
      <SortableKeyGrid
        items={orderedIrCodes}
        cellHeight={140}
        onReorder={handleReorder}
        onLongPress={openMenu}
        trailing={
          canLearn ? (
            <LearnKeyCell learning={isLearnMode} onClick={toggleLearnMode} showGuide={irCodes.length > 0} />
          ) : null
        }
        renderItem={(item) => (
          <Paper
            elevation={0}
            sx={{
              height: '100%',
              backgroundColor: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
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
            onClick={() => handleEmitIRCode(item.irCode)}
          >
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                fontSize: { xs: '1rem', sm: '1.2rem' },
                lineHeight: 1.2,
                fontWeight: 'normal',
                maxWidth: '100%',
                boxSizing: 'border-box',
                px: 1,
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 0.5,
                pointerEvents: 'none',
                whiteSpace: 'pre-line',
              }}
            >
              {item.title}
            </Typography>
          </Paper>
        )}
      />
      <KeyHints show={irCodes.length > 0} />
    </Box>
  );

  // 如果正在加载
  if (isLoading) {
    return (
      <Card sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', ...frameSx }}>
        <PageHeader onBack={showBack ? goBack : undefined} title={remote?.alias} />
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
      <Card sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', ...frameSx }}>
        <PageHeader onBack={showBack ? goBack : undefined} title={remote?.alias} />
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
          height: '100dvh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          padding: 0,
          margin: 0,
          '& .MuiCardContent-root': {
            padding: 0,
          },
          ...frameSx,
        }}
      >
        <PageHeader
          onBack={showBack ? goBack : undefined}
          title={
            <EditableText
              style={pageHeaderTitleStyle}
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
          }
          action={
            <>
              {canLearn && isLearnMode && (
                <IconButton onClick={toggleLearnMode}>
                  <HighlightOffRoundedIcon />
                </IconButton>
              )}
            </>
          }
        />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <CardContent
            sx={{
              flex: 1,
              pt: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
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
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', ...scrollSx }}>
              {/* 还没有按键：上方显示学习示意图和说明，下方网格里只有「学习新按键」一格 */}
              {irCodes.length === 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    gap: 2,
                    px: 4,
                    pt: 3,
                    pb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
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
                      {t('pages.ir.remote.learnGuide')}
                    </Typography>
                  </Box>
                </Box>
              )}
              {renderIRCodeGrid()}
            </Box>
          </CardContent>
        </Box>
      </Card>

      {menuElement}
    </>
  );
};

export default RemoteLearn;
