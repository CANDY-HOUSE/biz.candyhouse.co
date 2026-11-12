import BackButton from '@/components/BackButton';
import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent, Box, Typography, IconButton, Paper } from '@mui/material';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import { HXDCommandProcessor } from '../utils/HXDCommandProcessor';
import EditableText from '@/components/EditableText.js';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils.js';
import { getRemotePanel } from './panels/index.js';
import { IR_TYPE } from '../utils/irTypes.js';
import SortableKeyGrid from '../components/SortableKeyGrid.js';
import { useKeyOrder } from '../hooks/useKeyOrder.js';
import { useRemoteKeys } from '../hooks/useRemoteKeys.js';
import { useIrLearning } from '../hooks/useIrLearning.js';
import { KeyMoreButton, useKeyEditMenu } from '../components/KeyEditMenu.js';
import LearnHint from '../components/LearnHint.js';
import { KEY_KIND, mergeRemoteKeys, mapKeyIds } from '../utils/remoteKeys.js';
import { getNonAirKeyId, isNonAirKeyAvailable, getNonAirPowerOnKeyId, getNonAirPowerOffKeyId } from './keyIds.js';

const RemoteNonAir = () => {
  const navigate = useNavigate();
  const [clickedItem, setClickedItem] = useState(null);
  const [searchParams] = useSearchParams();

  const hub3DeviceId = searchParams.get('hub3DeviceId');
  const [remote, setRemote] = useState({});

  const commandProcessor = useMemo(() => new HXDCommandProcessor(), []);
  const { gAuth, gStripe, setSnackbarValue, gMediaType } = useContext(GlobalStateContext);
  const remoteCtrl = useRemoteCtrl(gAuth, gStripe, setSnackbarValue);
  const {
    sendIR,
    updateRemoteState,
    addIRRemote,
    modifyIRRemote,
    addRemoteToMatter,
    updateLocalRemoteList,
    setRemoteKeyOrder,
  } = remoteCtrl;
  const [hasRemoteSave, setHasRemoteSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localRemoteAlias, setLocalRemoteAlias] = useState('');
  const [command, setCommand] = useState('');
  const [matchedRemotes, setMatchedRemotes] = useState([]);
  const { t } = useTranslation();
  const isMobile = gMediaType.isMobile;

  useEffect(() => {
    const initializeRemote = () => {
      const storedMatchResult = sessionStorage.getItem('autoMatchResult');
      if (storedMatchResult) {
        try {
          const matchData = JSON.parse(storedMatchResult);
          const isRecent = Date.now() - matchData.timestamp < 3000;

          if (matchData.fromAutoMatch && matchData.selectedRemote && isRecent) {
            const newRemote = matchData.selectedRemote.irRemote || matchData.selectedRemote;
            console.log('提取的 irRemote 数据:', newRemote);
            setRemote(newRemote);
            console.log('提取的 matchedRemotes 数据:', matchData.matchedRemotes.length);
            setMatchedRemotes(matchData.matchedRemotes || []);

            sessionStorage.removeItem('autoMatchResult');
            console.log('已清理 sessionStorage 中的匹配结果');
            return;
          } else {
            sessionStorage.removeItem('autoMatchResult');
          }
        } catch (error) {
          console.error('parse sessionStorage match Result error:', error);
          sessionStorage.removeItem('autoMatchResult');
        }
      }
      const defaultRemote = searchParams.get('remote');
      if (defaultRemote) {
        try {
          setRemote(JSON.parse(defaultRemote));
          console.log('已使用默认 remote 参数初始化');
        } catch (error) {
          console.error('parse default remote parameter error:', error);
        }
      } else {
        console.warn('没有找到 remote 参数');
      }
    };

    initializeRemote();
  }, []);

  useEffect(() => {
    const isSaved = remote?.uuid && remote.uuid.trim() !== '';
    setHasRemoteSave(isSaved);
    setLocalRemoteAlias(remote?.alias || '');
    console.log('remote update :', remote);
  }, [remote]);

  // 按遥控器来源加载按键面板：HXD（code < 30000）用 panels/hxdPanels.js，SwitchBot 用 panels/switchbotPanels.js。
  // 遥控器数据还没加载（没有 code，判断不了来源）时先不画按钮。
  const deviceConfig = useMemo(
    () => (remote.code === undefined || remote.code === null ? [] : getRemotePanel(remote.type, remote.code, t)),
    [remote.type, remote.code, t]
  );

  const showError = useCallback(
    (key) => setSnackbarValue({ open: true, msg: t(key), severity: 'error', logReason: key }),
    [setSnackbarValue, t]
  );

  // 按键 = 预置按键（全量存储后以后台为准，之前是整个面板）+ 学习按键；未保存的遥控器只能改预置按键，先存草稿
  const savedUuid = hasRemoteSave ? remote.uuid : '';
  const remoteKeys = useRemoteKeys({
    remote,
    hub3DeviceId,
    savedUuid,
    panelItems: deviceConfig,
    api: remoteCtrl,
    // 全量写入后：本地顺序里的面板 id 换成 keyUUID，同步本地遥控器列表（keysStored、转换后的顺序）
    onStored: (data) => {
      if (Array.isArray(data?.keyOrder) && data.keyOrder.length > 0) remote.keyOrder = data.keyOrder;
      remapIds(data?.idMap);
      updateLocalRemoteList(hub3DeviceId, { ...remote, keysStored: true });
    },
  });
  const allItems = useMemo(
    () => mergeRemoteKeys(deviceConfig, remoteKeys.rows, remoteKeys.stored, t('pages.ir.remote.mobileDefaultKeyName')),
    [deviceConfig, remoteKeys.rows, remoteKeys.stored, t]
  );

  // 右上角「+」学习新按键：遥控器保存后才显示；从 App 打开且为第一级页面时不显示（同自学习页，避免退出时学习模式没恢复）
  const isFirstLevelFromApp =
    (searchParams.get('fromType') === 'app' || gStripe.isFromApp) && window.history.length < 2;
  const { isLearnMode, toggleLearnMode, enterLearnMode } = useIrLearning({
    hub3DeviceId,
    remoteUuid: remote.uuid,
    enabled: !!hasRemoteSave && !!hub3DeviceId,
    lazy: true,
    api: remoteCtrl,
    onLearned: remoteKeys.addLearnedRow,
    onError: showError,
  });

  // 按键排序：默认顺序 = 面板顺序，学习按键在后；拖曳结果按按键 id 存（已保存的遥控器写后台，未保存的先存草稿）
  const defaultKeyIds = useMemo(() => allItems.map((item) => item.id), [allItems]);
  const { orderedIds, handleReorder, keepForReturn, removeKey, remapIds, replaceOrder, takeOrderForSave } = useKeyOrder(
    {
      remote,
      savedUuid: hasRemoteSave ? remote.uuid : '',
      defaultIds: defaultKeyIds,
      persist: (uuid, keyOrder) => setRemoteKeyOrder(hub3DeviceId, uuid, keyOrder),
      onPersisted: (keyOrder) => updateLocalRemoteList(hub3DeviceId, { ...remote, keyOrder }),
    }
  );
  const orderedItems = useMemo(
    () => orderedIds.map((id) => allItems.find((item) => item.id === id)).filter(Boolean),
    [orderedIds, allItems]
  );

  // 拖拽：第一次拖时先把按键全量写入后台（已全量存储时不做），顺序照常由 ir_device_key_order 保存
  const onReorder = (ids) => {
    if (hasRemoteSave && !remoteKeys.stored) {
      // 先在页面上换成拖完的顺序；全量写入时后台把这份顺序一起换成 keyUUID，写完再按新的 id 写一次（防止写入排在别的操作后面）
      replaceOrder(ids, false);
      remoteKeys.ensureStored((ok, data) => {
        if (ok && data?.idMap) replaceOrder(mapKeyIds(ids, data.idMap), true);
      }, ids);
      return;
    }
    handleReorder(ids);
  };

  // 按键的「…」菜单：编辑名称、删除（预置按键删掉这一行；学习按键连同学到的码一起删掉）
  const { openMenu, menuElement } = useKeyEditMenu({
    getName: (item) => item.customName || item.title || '',
    onEmptyName: () =>
      setSnackbarValue({ open: true, msg: t('pages.ir.remote.nameCannotBeEmpty'), severity: 'warning' }),
    onRename: (item, name) =>
      remoteKeys.renameKey(item, name, (success) => {
        if (!success) showError('pages.ir.remote.updateIRCodeFail');
      }),
    onDelete: (item) =>
      remoteKeys.deleteKey(item, (success, keyId) => {
        if (success) removeKey(keyId);
        else showError('pages.ir.remote.deleteIRCodeFail');
      }),
  });

  // 获取设备类型显示名称
  const getDeviceTypeName = () => {
    const irTypeNum = parseInt(remote.type);
    const typeNames = {
      [IR_TYPE.FANS]: t('pages.ir.list.fan'),
      [IR_TYPE.LIGHT]: t('pages.ir.list.light'),
      [IR_TYPE.TV]: t('pages.ir.list.tv'),
      [IR_TYPE.IPTV]: t('pages.ir.list.iptv'),
      [IR_TYPE.STB]: t('pages.ir.list.stb'),
      [IR_TYPE.DVD]: t('pages.ir.list.dvd'),
      [IR_TYPE.PJT]: t('pages.ir.list.projector'),
      [IR_TYPE.DC]: t('pages.ir.list.camera'),
      [IR_TYPE.AP]: t('pages.ir.list.airPurifier'),
      [IR_TYPE.AUDIO]: t('pages.ir.list.audio'),
      [IR_TYPE.HW]: t('pages.ir.list.waterHeater'),
      [IR_TYPE.ROBOT]: t('pages.ir.list.robot'),
    };
    return typeNames[irTypeNum];
  };

  // 构建命令的函数
  // 键号按 keyIds.js 取（1..N = HXD 码表列号，64 起 = SwitchBot 独有键），后端用同一份映射找码。
  // 返回 null 表示这台遥控器没有这个键（码源里就没有这一列），不发；返回 '' 表示构建出错。
  const buildCommand = (item, remoteDevice) => {
    try {
      // 键号按面板按键 id（presetId）取；全量存储后按键 id 是 keyUUID
      const key = getNonAirKeyId(remote.type, item.presetId ?? item.id);
      console.log('buildCommand item:', item.id, 'key:', key, 'code:', remoteDevice.code, 'irType:', remote.type);
      if (!isNonAirKeyAvailable(remote.type, remoteDevice.code, key)) {
        return null;
      }
      const command = commandProcessor.setKey(key).setCode(remoteDevice.code).buildNonAirCommand();
      return commandProcessor.toHexString(command);
    } catch (error) {
      console.error('buildCommand error:', error);
      return '';
    }
  };

  // 学习按键：发学到的码（learnEmit），不改遥控器的状态
  const emitLearnedKey = (item) => {
    sendIR(hub3DeviceId, remote.uuid, item.id, 'learnEmit', remote.type, (response) => {
      if (!response.success) console.error('learned IR code send failed:', response.message);
    });
  };

  // 处理项目点击
  const handleItemClick = async (item) => {
    if (!item.clickable || clickedItem) return;
    if (isLearnMode) {
      setSnackbarValue({ open: true, msg: t('pages.ir.remote.cannotSendInLearnMode'), severity: 'warning' });
      return;
    }

    setClickedItem(item.id);
    if (item.kind === KEY_KIND.LEARNED) {
      emitLearnedKey(item);
      setTimeout(() => setClickedItem(null), 1000);
      return;
    }

    try {
      // 构建并发送红外码
      let cmd = buildCommand(item, remote);
      if (cmd === null) {
        setSnackbarValue({
          open: true,
          // msg: t('pages.ir.remote.keyNotAvailable'),
          severity: 'info',
        });
        return;
      }
      setCommand(cmd);
      if (!cmd) {
        console.error('handleItemClick buildCommand is empty!');
        setSnackbarValue({
          logScope: 'pages/personal/devices/wifi-module/ir/remote-non-air/index.handleItemClick',
          logReason: 'pages.ir.remote.operationFailed',
          open: true,
          msg: t('pages.ir.remote.operationFailed'),
          severity: 'error',
        });
        return;
      }

      console.log('handleItemClick buildCommand:', cmd, 'device:', hub3DeviceId);

      // 使用 sendIR 发送红外码
      let remoteId = remote.uuid || '';
      sendIR(hub3DeviceId, remoteId, cmd, 'remoteEmit', remote.type, (response) => {
        if (response.success) {
          console.log('send IR code sent successfully:', response.data);
          if (remote.uuid) {
            updateRemoteState(hub3DeviceId, remote.uuid, cmd, (updateResponse) => {
              if (updateResponse.success) {
                console.log('device state updated successfully:', remote.uuid, cmd);
              } else {
                console.error('device state update failed:', updateResponse.message);
              }
            });
          }
        } else if (response.code === 406) {
          // 后端找不到这台遥控器这个键的码（HXD 码表该列为空 / SwitchBot 数据里没有）。
          // useRemoteCtrl 对 406 是全局静默的（空调页依赖这点），所以在这里单独提示。
          console.warn('IR key not available:', response.message);
          setSnackbarValue({
            open: true,
            // msg: t('pages.ir.remote.keyNotAvailable'),
            severity: 'info',
          });
        } else {
          console.error('IR code send failed:', response.message);
        }
      });
    } catch (error) {
      console.error('handleItemClick error:', error);
      setSnackbarValue({
        logScope: 'pages/personal/devices/wifi-module/ir/remote-non-air/index.handleItemClick',
        logReason: 'pages.ir.remote.operationFailed',
        open: true,
        msg: t('pages.ir.remote.operationFailed'),
        severity: 'error',
      });
    } finally {
      // 重置点击状态
      setTimeout(() => {
        setClickedItem(null);
      }, 1000);
    }
  };
  const handleMatchClick = async () => {
    keepForReturn();
    remoteKeys.keepForReturn();
    navigate({
      pathname: '/biz/access-control/remote-match',
      search: createSearchParams({
        hub3DeviceId: hub3DeviceId,
        remote: JSON.stringify(remote),
        matchedRemotes: JSON.stringify(matchedRemotes),
        ...(gStripe.isFromApp && { fromType: 'app' }),
      }).toString(),
    });
  };

  // 处理修改
  const handleModify = (newValue, onComplete) => {
    try {
      if (!remote.uuid || remote.uuid.trim() === '') {
        onComplete(true);
        setLocalRemoteAlias(newValue);
        return;
      }

      modifyIRRemote(hub3DeviceId, remote.uuid, newValue, (response) => {
        console.log('modifyIRRemote callback response:', response);

        if (response.success) {
          onComplete(true);
          console.log('remote modified successfully:', response.data);
          remote.alias = newValue;
          setLocalRemoteAlias(newValue);
          updateLocalRemoteList(hub3DeviceId, remote);
        } else {
          onComplete(false);
          console.error('remote modification failed:', response.message);
          setSnackbarValue({
            logScope: 'pages/personal/devices/wifi-module/ir/remote-non-air/index.handleModify',
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
        logScope: 'pages/personal/devices/wifi-module/ir/remote-non-air/index.handleModify',
        logReason: 'pages.ir.remote.handleFailed',
        open: true,
        msg: t('pages.ir.remote.handleFailed'),
        severity: 'error',
      });
    }
  };

  const addIRRemoteToMatter = (remoteToSave) => {
    const onCommand = getPowerOnCommand(remoteToSave);
    const offCommand = getPowerOffCommand(remoteToSave);
    addRemoteToMatter(hub3DeviceId, onCommand, offCommand, remoteToSave, (response) => {
      console.log('addRemoteToMatter callback response:', response);
    });
  };
  // Matter 桥接只有「开」「关」两个动作：按码源挑覆盖率最高的电源键（如投影仪 HXD 用开机/关机两列，
  // SwitchBot 用单一电源键），见 keyIds.js 的 POWER_KEYS。
  const getPowerOffCommand = (remoteToSave) => {
    const key = getNonAirPowerOffKeyId(remoteToSave.type, remoteToSave.code) ?? 0x01;
    return commandProcessor.toHexString(commandProcessor.setKey(key).setCode(remoteToSave.code).buildNonAirCommand());
  };

  const getPowerOnCommand = (remoteToSave) => {
    const key = getNonAirPowerOnKeyId(remoteToSave.type, remoteToSave.code) ?? 0x01;
    return commandProcessor.toHexString(commandProcessor.setKey(key).setCode(remoteToSave.code).buildNonAirCommand());
  };

  // 处理保存
  const handleSave = () => {
    if (isSaving) return; // 防止重复保存
    setIsSaving(true);

    try {
      const remoteToSave = {
        uuid: biz3utils.generateUUID(),
        model: remote.model,
        state: command,
        alias: localRemoteAlias,
        code: remote.code,
        type: remote.type,
        deviceUUID: hub3DeviceId,
        keys: [],
      };

      addIRRemote(remoteToSave, (response) => {
        console.log('addIRRemote callback response:', response);

        if (response.success) {
          console.log('remote saved successfully:', response.data);
          remote.uuid = remoteToSave.uuid;
          // 拖过的顺序随按键全量写入一起交给后台，后台换成 keyUUID 后写入
          const keyOrder = takeOrderForSave();
          remoteKeys.persistAfterSave(remoteToSave.uuid, keyOrder, (success) => {
            if (!success) showError('pages.ir.remote.updateIRCodeFail');
          });
          setHasRemoteSave(true);
          updateLocalRemoteList(hub3DeviceId, keyOrder ? { ...remoteToSave, keyOrder } : remoteToSave);
          addIRRemoteToMatter(remoteToSave);
        } else {
          console.error('remote save failed:', response.message);
          setIsSaving(false);
          setSnackbarValue({
            logScope: 'pages/personal/devices/wifi-module/ir/remote-non-air/index.handleSave',
            open: true,
            msg: t(response.message || 'pages.ir.remote.addIRRemoteFail'),
            severity: 'error',
          });
        }
      });
    } catch (error) {
      setIsSaving(false);
      console.error('handleSave error:', error);
      setSnackbarValue({
        logScope: 'pages/personal/devices/wifi-module/ir/remote-non-air/index.handleSave',
        logReason: 'pages.ir.remote.handleFailed',
        open: true,
        msg: t('pages.ir.remote.handleFailed'),
        severity: 'error',
      });
    }
  };

  return (
    <Card
      sx={{
        height: '100dvh',
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
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {!isMobile && <BackButton onClick={() => navigate(-1)} sx={{ flexShrink: 0, mr: 1 }}></BackButton>}
            <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden', mr: 1 }}>
              <EditableText
                style={{
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  lineHeight: '1.3',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                initialValue={remote.alias}
                onSave={
                  hasRemoteSave
                    ? (newValue, callback) => {
                        if (!newValue || !callback) {
                          return;
                        }
                        handleModify(newValue, (success) => {
                          callback(success);
                        });
                      }
                    : null
                }
              />
            </Box>
            {!hasRemoteSave && (
              <IconButton onClick={handleSave} sx={{ flexShrink: 0 }}>
                <CheckCircleOutlineIcon />
              </IconButton>
            )}
            {hasRemoteSave && !isFirstLevelFromApp && (
              <IconButton onClick={toggleLearnMode} sx={{ flexShrink: 0 }}>
                {isLearnMode ? <HighlightOffRoundedIcon /> : <AddCircleOutlineOutlinedIcon />}
              </IconButton>
            )}
          </Box>
        }
        sx={{
          // 有学习说明时标题栏下边距收小，让说明贴近右上角的 ⊕
          pb: hasRemoteSave && !isFirstLevelFromApp ? 0 : 1,
          px: '10px',
          '& .MuiCardHeader-content': {
            overflow: 'hidden',
          },
        }}
      />

      <CardContent
        sx={{
          display: 'flex',
          // 按键多的品类（如音响 29 键、DVD 31 键）内容会超出一屏，需可滚动
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
          width: '100%',
          padding: 0,
          margin: 0,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 学习说明：标题栏下单独一行；网页靠右对齐，结尾落在右上角 ⊕ 下方 */}
        {hasRemoteSave && !isFirstLevelFromApp && (
          <LearnHint align={isMobile ? 'left' : 'right'} onAdd={enterLearnMode} />
        )}
        <Box
          sx={{
            px: 1,
            width: '100%',
            maxWidth: 1080,
            display: 'flex',
            padding: 0,
            margin: 0,
            pb: 2,
            justifyContent: 'center',
          }}
        >
          <SortableKeyGrid
            items={orderedItems}
            onReorder={onReorder}
            renderItem={(item) => {
              const isClicked = clickedItem === item.id;
              return (
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: item.clickable ? 'pointer' : 'default',
                    borderRadius: 0,
                    opacity: isClicked ? 0.3 : 1,
                    transition: 'opacity 0.2s',
                    margin: 0,
                    backgroundColor: 'transparent',
                    position: 'relative',
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: '1rem', sm: '1.2rem' },
                      textAlign: 'center',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      px: 1,
                      overflowWrap: 'anywhere',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      opacity: isClicked ? 0.3 : 1,
                      lineHeight: 1.2,
                      fontWeight: 'normal',
                      color: 'inherit',
                    }}
                  >
                    {item.customName || item.title}
                  </Typography>
                  <KeyMoreButton onClick={(e) => openMenu(e, item)} />
                </Paper>
              );
            }}
          />
        </Box>
      </CardContent>
      <Box
        sx={{
          flexShrink: 0,
          width: '100%',
          pt: 1,
          pb: 'max(12px, env(safe-area-inset-bottom))',
          backgroundColor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {!hasRemoteSave && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              py: 1,
              cursor: 'pointer',
              borderTop: '1px solid',
              borderColor: 'divider',
              width: '100%',
            }}
            onClick={() => handleMatchClick()}
          >
            <Typography variant="body2" color="text.secondary">
              {t('pages.ir.remote.cannotControlAutoMatchRemote', { type: getDeviceTypeName() })} &gt;
            </Typography>
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 1,
            fontSize: '0.7rem',
          }}
        >
          HXD {remote?.alias}
        </Typography>
      </Box>
      {menuElement}
    </Card>
  );
};

export default RemoteNonAir;
