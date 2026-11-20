// src/components/AirConditionerRemote.js
import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, Box, Typography, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import { HXDParametersSwapper } from '../utils/HXDParametersSwapper';
import { HXDCommandProcessor } from '../utils/HXDCommandProcessor';
import { getRemoteSource, getAirTempRange, clampAirTemp } from '../utils/irRemoteUtils.js';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import EditableText from '@/components/EditableText.js';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils.js';

import { AirHero, AirFunctionTiles } from './AirPanel.js';
import { parseAirState } from '../utils/airState.js';

import SortableKeyGrid from '../components/SortableKeyGrid.js';
import { useKeyOrder } from '../hooks/useKeyOrder.js';
import { useRemotePageFrame } from '../hooks/useRemotePageFrame.js';
import PageHeader, { pageHeaderTitleStyle } from '@/components/PageHeader';
import { useRemoteKeys } from '../hooks/useRemoteKeys.js';
import { useIrLearning } from '../hooks/useIrLearning.js';
import { useKeyEditMenu } from '../components/KeyEditMenu.js';
import LearnKeyCell from '../components/LearnKeyCell.js';
import KeyHints from '../components/KeyHints.js';
import { KEY_KIND, mergeRemoteKeys, mapKeyIds } from '../utils/remoteKeys.js';

// 可以改名的空调控件：开机、关机。其余是组合控件（标题随状态变化，如温度、模式、风速），只能删除、不能改名
const AIR_RENAMABLE_IDS = ['power_on', 'power_off'];
// 下方可拖拽排序的四个功能块
const AIR_TILE_IDS = ['mode', 'fan_speed', 'wind_direction', 'auto_swing'];

const initialStateFromParam = (param) => {
  try {
    const remote = param ? JSON.parse(param) : null;
    return remote?.uuid ? parseAirState(remote) : null;
  } catch {
    return null;
  }
};

const RemoteAir = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 第一帧就用遥控器记录的状态（之后 effect 里还会照原逻辑恢复一次），避免先画默认状态再跳变
  const [currentState, setCurrentState] = useState(
    () =>
      initialStateFromParam(searchParams.get('remote')) || {
        power: false,
        temperature: 25,
        mode: 1, // 0: 自动, 1: 制冷, 2: 除湿, 3: 送风, 4: 制热
        fanSpeed: 0, // 0: 自动, 1: 最小, 2: 中等, 3: 最大
        windDirection: 1, // 0: 向上, 1: 居中, 2: 向下
        autoSwing: true, // false: 停止摆风, true: 自动摆风
      }
  );
  const [clickedItem, setClickedItem] = useState(null);
  const hub3DeviceId = searchParams.get('hub3DeviceId');
  const parametersSwapper = useMemo(() => new HXDParametersSwapper(), []);
  const commandProcessor = useMemo(() => new HXDCommandProcessor(), []);
  const { gAuth, gStripe, setSnackbarValue } = useContext(GlobalStateContext);
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
  const [remote, setRemote] = useState({});
  const [localRemoteAlias, setLocalRemoteAlias] = useState('');
  const [command, setCommand] = useState('');
  const [matchedRemotes, setMatchedRemotes] = useState([]);
  const { t } = useTranslation();
  const { showBack, goBack, frameSx, scrollSx } = useRemotePageFrame();

  useEffect(() => {
    const initializeRemote = () => {
      const storedMatchResult = sessionStorage.getItem('autoMatchResult');
      if (storedMatchResult) {
        try {
          const matchData = JSON.parse(storedMatchResult);
          const isRecent = Date.now() - matchData.timestamp < 3000; // 3秒内有效

          if (matchData.fromAutoMatch && matchData.selectedRemote && isRecent) {
            const newRemote = matchData.selectedRemote.irRemote || matchData.selectedRemote;
            console.log('get remote data', newRemote);
            setRemote(newRemote);
            setMatchedRemotes(matchData.matchedRemotes || []);
            sessionStorage.removeItem('autoMatchResult');
            return;
          } else {
            // 数据过期或无效，清理掉
            sessionStorage.removeItem('autoMatchResult');
          }
        } catch (error) {
          console.error('parse sessionStorage match result error:', error);
          sessionStorage.removeItem('autoMatchResult');
        }
      }

      // 2. sessionStorage 中没有数据，使用默认的 remote 参数
      const defaultRemote = searchParams.get('remote');
      if (defaultRemote) {
        try {
          setRemote(JSON.parse(defaultRemote));
          console.log('use default remote param', JSON.parse(defaultRemote));
        } catch (error) {
          console.error('parse default remote param error:', error);
        }
      } else {
        console.warn('no remote param found in url');
      }
    };

    initializeRemote();
  }, []);

  useEffect(() => {
    const isSaved = remote?.uuid && remote.uuid.trim() !== '';
    setHasRemoteSave(isSaved);
    setLocalRemoteAlias(remote.alias);
    console.log('update hasRemoteSave:', isSaved, 'remote.uuid:', remote?.uuid, 'localRemoteAlias:', localRemoteAlias);
    if (isSaved && remote.state) {
      console.log('Restoring state from saved remote', remote.state);
      restoreStateFromRemote(remote);
    }
  }, [remote]);

  // 换了遥控器（例如自动匹配结果里切换）时，把当前温度收进新遥控器的可调范围
  useEffect(() => {
    if (remote?.code == null) return;
    setCurrentState((s) => {
      const t = clampAirTemp(s.temperature, remote);
      return t === s.temperature ? s : { ...s, temperature: t };
    });
  }, [remote?.code]);

  // 构建命令的函数
  const buildCommand = useCallback(
    (keyType, remoteDevice, newState) => {
      try {
        console.log('buildCommand currentState:', newState, 'remoteDevice:', remoteDevice);

        const key = parametersSwapper.getAirKey(keyType);
        const command = commandProcessor
          .setKey(key)
          .setCode(remoteDevice.code)
          .setPower(newState.power ? 0x01 : 0x00)
          .setTemperature(newState.temperature)
          .setModel(parametersSwapper.getModeValue(newState.mode))
          .setFanSpeed(parametersSwapper.getFanSpeedValue(newState.fanSpeed))
          .setWindDirection(parametersSwapper.getWindDirectionValue(newState.windDirection))
          .setAutoWindDirection(newState.autoSwing ? 0x01 : 0x00)
          .buildAirCommand();
        return commandProcessor.toHexString(command);
      } catch (error) {
        console.error('buildCommand error:', error);
        return '';
      }
    },
    [parametersSwapper, commandProcessor]
  );

  // 获取模式名称
  const getModeTitle = (modeIndex) => {
    const modes = [
      t('pages.ir.remote.autoMode'),
      t('pages.ir.remote.coolMode'),
      t('pages.ir.remote.dehumidifyMode'),
      t('pages.ir.remote.fanMode'),
      t('pages.ir.remote.heatMode'),
    ];
    return modes[modeIndex] || t('pages.ir.remote.coolMode');
  };

  // 获取风速名称
  const getFanSpeedTitle = (speedIndex) => {
    const speeds = [
      t('pages.ir.remote.fanSpeedAuto'),
      t('pages.ir.remote.fanSpeedLow'),
      t('pages.ir.remote.fanSpeedMedium'),
      t('pages.ir.remote.fanSpeedHigh'),
    ];
    return speeds[speedIndex] || t('pages.ir.remote.fanSpeedAuto');
  };

  // 获取风向名称
  const getWindDirectionTitle = (directionIndex) => {
    const directions = [
      t('pages.ir.remote.windDirectionUp'),
      t('pages.ir.remote.windDirectionCenter'),
      t('pages.ir.remote.windDirectionDown'),
    ];
    return directions[directionIndex] || t('pages.ir.remote.windDirectionCenter');
  };

  // 获取摆风名称
  const getSwingTitle = (isSwing) => {
    return isSwing ? t('pages.ir.remote.autoSwing') : t('pages.ir.remote.stopSwing');
  };

  // 使用 useMemo 来计算空调控制项配置
  const airControlItems = useMemo(
    () => [
      {
        id: 'power_on',
        type: 'POWER_ON',
        title: t('pages.ir.remote.on'),
        position: { row: 0, col: 0 },
        clickable: true,
      },
      {
        id: 'temperature_display',
        type: 'TEMPERATURE_DISPLAY',
        title: `${currentState.temperature}°C`,
        position: { row: 0, col: 1 },
        clickable: false,
      },
      {
        id: 'power_off',
        type: 'POWER_OFF',
        title: t('pages.ir.remote.off'),
        position: { row: 0, col: 2 },
        clickable: true,
      },
      {
        id: 'temp_add',
        type: 'TEMP_ADD',
        title: t('pages.ir.remote.temperature'),
        position: { row: 1, col: 0 },
        clickable: true,
      },
      {
        id: 'mode',
        type: 'MODE',
        title: getModeTitle(currentState.mode),
        position: { row: 1, col: 1 },
        clickable: true,
      },
      {
        id: 'temp_reduce',
        type: 'TEMP_REDUCE',
        title: t('pages.ir.remote.temperature'),
        position: { row: 1, col: 2 },
        clickable: true,
      },
      {
        id: 'fan_speed',
        type: 'FAN_SPEED',
        title: getFanSpeedTitle(currentState.fanSpeed),
        position: { row: 2, col: 0 },
        clickable: true,
      },
      {
        id: 'wind_direction',
        type: 'WIND_DIRECTION',
        title: getWindDirectionTitle(currentState.windDirection),
        position: { row: 2, col: 1 },
        clickable: true,
      },
      {
        id: 'auto_swing',
        type: 'AUTO_SWING',
        title: getSwingTitle(currentState.autoSwing),
        position: { row: 2, col: 2 },
        clickable: true,
      },
    ],
    [currentState]
  );

  const showError = useCallback(
    (key) => setSnackbarValue({ open: true, msg: t(key), severity: 'error', logReason: key }),
    [setSnackbarValue, t]
  );

  // 按键 = 空调控件（全量存储后以后台为准，之前是全部 9 个；开关机可改名）+ 学习按键；未保存的遥控器只能改空调控件，先存草稿
  const savedUuid = hasRemoteSave ? remote.uuid : '';
  const remoteKeys = useRemoteKeys({
    remote,
    hub3DeviceId,
    savedUuid,
    panelItems: airControlItems,
    api: remoteCtrl,
    // 全量写入后：本地顺序里的面板 id 换成 keyUUID，同步本地遥控器列表（keysStored、转换后的顺序）
    onStored: (data) => {
      if (Array.isArray(data?.keyOrder) && data.keyOrder.length > 0) remote.keyOrder = data.keyOrder;
      remapIds(data?.idMap);
      updateLocalRemoteList(hub3DeviceId, { ...remote, keysStored: true });
    },
  });
  const allItems = useMemo(
    () =>
      mergeRemoteKeys(airControlItems, remoteKeys.rows, remoteKeys.stored, t('pages.ir.remote.mobileDefaultKeyName')),
    [airControlItems, remoteKeys.rows, remoteKeys.stored, t]
  );
  const defaultKeyIds = useMemo(() => allItems.map((item) => item.id), [allItems]);

  // 右上角「+」学习新按键：遥控器保存后才显示；从 App 打开且为第一级页面时不显示（同自学习页）
  const isFirstLevelFromApp =
    (searchParams.get('fromType') === 'app' || gStripe.isFromApp) && window.history.length < 2;
  // 能学习：遥控器已保存，且不是从 App 直接打开的一级页
  const canLearn = hasRemoteSave && !isFirstLevelFromApp;
  const { isLearnMode, toggleLearnMode } = useIrLearning({
    hub3DeviceId,
    remoteUuid: remote.uuid,
    enabled: !!hasRemoteSave && !!hub3DeviceId,
    lazy: true,
    api: remoteCtrl,
    onLearned: remoteKeys.addLearnedRow,
    onError: showError,
  });

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

  // 已全量存储的遥控器在按键取回之前没有预置按键可显示：先按整个面板显示主控卡片和功能块，避免进页面时内容空白再出现
  const keysLoading = hasRemoteSave && remoteKeys.stored && !remoteKeys.loaded;
  const fullPanelItems = useMemo(() => mergeRemoteKeys(airControlItems, [], false, ''), [airControlItems]);

  // 每个空调控件（presetId）第一个按键放进主控卡片 / 功能块，其余（学习按键、重复的预置按键）放进下方可拖拽的网格
  const { controls, tileItems, gridItems } = useMemo(() => {
    const panel = {};
    const tiles = [];
    const rest = [];
    (keysLoading ? fullPanelItems : orderedItems).forEach((item) => {
      if (item.kind !== KEY_KIND.PRESET || panel[item.presetId]) {
        rest.push(item);
        return;
      }
      panel[item.presetId] = item;
      if (AIR_TILE_IDS.includes(item.presetId)) tiles.push(item);
    });
    return { controls: panel, tileItems: tiles, gridItems: keysLoading ? [] : rest };
  }, [keysLoading, fullPanelItems, orderedItems]);

  // 按键还没取回时 id 还是面板 id，不能改名 / 删除
  const openKeyMenu = (item) => {
    if (!keysLoading) openMenu(item);
  };

  // 功能块拖拽：只在功能块原来的位置之间换顺序，其他按键位置不变
  const onTileReorder = (ids) => {
    const tileIds = new Set(ids);
    let next = 0;
    onReorder(orderedIds.map((id) => (tileIds.has(id) ? ids[next++] : id)));
  };

  // 网格里只排下方这些按键：主控卡片和功能块的按键保持原有顺序放在前面
  const onGridReorder = (ids) => {
    const gridIds = new Set(ids);
    onReorder([...orderedIds.filter((id) => !gridIds.has(id)), ...ids]);
  };

  // 按键的「…」菜单：编辑名称（组合控件置灰）、删除
  const { openMenu, menuElement } = useKeyEditMenu({
    canRename: (item) => item.kind === KEY_KIND.LEARNED || AIR_RENAMABLE_IDS.includes(item.presetId ?? item.id),
    getName: (item) => item.customName || item.title || '',
    isNameTaken: (item, name) =>
      orderedItems.some((other) => other.id !== item.id && (other.customName || other.title) === name),
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

  // 处理项目点击
  const handleItemClick = async (item) => {
    // 防止重复点击或点击不可点击项
    if (!item.clickable || clickedItem) return;
    if (isLearnMode) {
      setSnackbarValue({ open: true, msg: t('pages.ir.remote.cannotSendInLearnMode'), severity: 'warning' });
      return;
    }

    setClickedItem(item.id);
    // 学习按键：发学到的码（learnEmit），不改空调的状态
    if (item.kind === KEY_KIND.LEARNED) {
      sendIR(hub3DeviceId, remote.uuid, item.id, 'learnEmit', remote.type, (response) => {
        if (!response.success) console.error('learned IR code send failed:', response.message);
      });
      setTimeout(() => setClickedItem(null), 1000);
      return;
    }

    try {
      let newState = { ...currentState };
      switch (item.type) {
        case 'POWER_ON':
          handlePowerOn(newState);
          break;
        case 'POWER_OFF':
          handlePowerOff(newState);
          break;
        case 'TEMP_ADD':
          if (canAdjustTemperature()) {
            handleTemperatureAdd(newState);
            break;
          }
          return;
        case 'TEMP_REDUCE':
          if (canAdjustTemperature()) {
            handleTemperatureReduce(newState);
            break;
          }
          return;
        case 'MODE':
          handleModeChange(newState);
          break;
        case 'FAN_SPEED':
          handleFanSpeedChange(newState);
          break;
        case 'WIND_DIRECTION':
          handleWindDirectionChange(newState);
          break;
        case 'AUTO_SWING':
          handleAutoSwingChange(newState);
          break;
        default:
          break;
      }
      // 发出去的温度一定在该遥控器的可调范围内（旧版本保存的状态可能是 31/32℃）
      newState.temperature = clampAirTemp(newState.temperature, remote);
      setCurrentState(newState);
      let cmd = buildCommand(item.type, remote, newState);
      setCommand(cmd);
      if (!cmd) {
        console.error('handleItemClick buildCommand is empty!');
        setSnackbarValue({
          logScope: 'pages/personal/devices/wifi-module/ir/remote-air/index.handleItemClick',
          logReason: 'pages.ir.remote.operationFailed',
          open: true,
          msg: t('pages.ir.remote.operationFailed'),
          severity: 'error',
        });
        return;
      }

      console.log('handleItemClick buildCommand:', cmd, 'device:', hub3DeviceId);
      let remoteId = remote.uuid || '';
      sendIR(hub3DeviceId, remoteId, cmd, 'remoteEmit', remote.type, (response) => {
        console.log('sendIR callback response:', response);

        if (response.success) {
          console.log('send IR success', response.data);

          if (remote.uuid) {
            updateRemoteState(hub3DeviceId, remote.uuid, cmd, (updateResponse) => {
              if (updateResponse.success) {
                console.log('update device state success:', remote.uuid, cmd);
              } else {
                console.error('update device state failed:', updateResponse.message);
              }
              setRemote((preRemote) => ({ ...preRemote, state: cmd }));
              updateLocalRemoteList(hub3DeviceId, { ...remote, state: cmd });
            });
          }
        } else {
          console.error('send IR failed:', response.message);
        }
      });
    } catch (error) {
      console.error('handleItemClick error:', error);
      setSnackbarValue({
        logScope: 'pages/personal/devices/wifi-module/ir/remote-air/index.handleItemClick',
        logReason: 'pages.ir.remote.handleFailed',
        open: true,
        msg: t('pages.ir.remote.handleFailed'),
        severity: 'error',
      });
    } finally {
      setTimeout(() => {
        setClickedItem(null);
      }, 1000);
    }
  };

  // 开机
  const handlePowerOn = (newState) => {
    newState.power = true;
  };

  // 关机
  const handlePowerOff = (newState) => {
    newState.power = false;
  };
  // 温度增加
  const handleTemperatureAdd = (newState) => {
    newState.temperature = Math.min(getAirTempRange(remote).max, newState.temperature + 1);
  };

  // 温度减少
  const handleTemperatureReduce = (newState) => {
    newState.temperature = Math.max(getAirTempRange(remote).min, newState.temperature - 1);
  };

  // 模式切换
  const handleModeChange = (newState) => {
    newState.mode = (newState.mode + 1) % 5;
  };

  // 风速切换
  const handleFanSpeedChange = (newState) => {
    newState.fanSpeed = (newState.fanSpeed + 1) % 4;
  };

  // 风向切换
  const handleWindDirectionChange = (newState) => {
    newState.windDirection = (newState.windDirection + 1) % 3;
  };

  // 摆风切换
  const handleAutoSwingChange = (newState) => {
    newState.autoSwing = !newState.autoSwing;
  };

  // 检查是否可以调节温度（制冷、制热、自动模式）
  const canAdjustTemperature = () => {
    return [0, 1, 4].includes(currentState.mode);
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
          console.log('modify IR remote success:', response.data);
          setRemote((preRemote) => ({ ...preRemote, alias: newValue }));
          setLocalRemoteAlias(newValue);
          updateLocalRemoteList(hub3DeviceId, { ...remote, alias: newValue });
        } else {
          onComplete(false);
          console.error('modify IR remote failed:', response.message);
          setSnackbarValue({
            logScope: 'pages/personal/devices/wifi-module/ir/remote-air/index.handleModify',
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
        logScope: 'pages/personal/devices/wifi-module/ir/remote-air/index.handleModify',
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
  const getPowerOffCommand = (remoteToSave) => {
    var remoteState = { ...currentState };
    remoteState.power = false;
    return buildCommand('POWER_STATUS_OFF', remoteToSave, remoteState);
  };

  const getPowerOnCommand = (remoteToSave) => {
    var remoteState = { ...currentState };
    remoteState.power = true;
    return buildCommand('POWER_STATUS_ON', remoteToSave, remoteState);
  };

  // 处理保存
  const handleSave = () => {
    if (isSaving) return; // 防止重复保存
    setIsSaving(true);
    try {
      // 准备保存的数据
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
          console.log('add IR remote success:', response.data);
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
          console.error('add IR remote failed:', response.message);
          setSnackbarValue({
            logScope: 'pages/personal/devices/wifi-module/ir/remote-air/index.handleSave',
            open: true,
            msg: t(response.message || 'pages.ir.remote.addIRRemoteFail'),
            severity: 'error',
          });
          setIsSaving(false);
        }
      });
    } catch (error) {
      setIsSaving(false);
      console.error('handleSave error:', error);
      setSnackbarValue({
        logScope: 'pages/personal/devices/wifi-module/ir/remote-air/index.handleSave',
        logReason: 'pages.ir.remote.handleFailed',
        open: true,
        msg: t('pages.ir.remote.handleFailed'),
        severity: 'error',
      });
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

  const restoreStateFromRemote = useCallback(
    (remote) => {
      if (!remote?.uuid || remote.uuid.trim() === '' || !remote.state) {
        console.log('No valid remote state to restore');
        return;
      }

      try {
        const parsedState = commandProcessor.parseAirCommand(remote.state);
        if (!parsedState) {
          console.warn('Failed to parse remote state');
          return;
        }

        const uiState = parametersSwapper.convertToUIState(parsedState);
        if (!uiState) {
          console.warn('Failed to convert to UI state');
          return;
        }
        setCurrentState({ ...uiState, temperature: clampAirTemp(uiState.temperature, remote) });
        console.log('Successfully restored state:', uiState);
      } catch (error) {
        console.error('Error restoring state from remote:', error);
      }
    },
    [remote]
  );

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
        ...frameSx,
      }}
    >
      <PageHeader
        onBack={showBack ? goBack : undefined}
        title={
          <EditableText
            style={pageHeaderTitleStyle}
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
        }
        action={
          <>
            {!hasRemoteSave && (
              <IconButton onClick={handleSave} sx={{ flexShrink: 0 }}>
                <CheckCircleOutlineIcon />
              </IconButton>
            )}
            {canLearn && isLearnMode && (
              <IconButton onClick={toggleLearnMode} sx={{ flexShrink: 0 }}>
                <HighlightOffRoundedIcon />
              </IconButton>
            )}
          </>
        }
      />

      <CardContent
        sx={{
          display: 'flex',
          // 学习按键多了会超出一屏，需可滚动
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          ...scrollSx,
          width: '100%',
          padding: 0,
          margin: 0,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 600, boxSizing: 'border-box', px: 2, pt: 1, pb: 2 }}>
          {(controls.power_on ||
            controls.power_off ||
            controls.temperature_display ||
            controls.temp_add ||
            controls.temp_reduce) && (
            <>
              <AirHero
                state={currentState}
                controls={controls}
                canAdjustTemp={canAdjustTemperature()}
                tempRange={getAirTempRange(remote)}
                busyId={clickedItem}
                onPress={handleItemClick}
                onLongPress={openKeyMenu}
              />
              <Typography sx={{ mt: 1, mb: 2.5, textAlign: 'center', fontSize: 12, color: 'text.disabled' }}>
                {t('pages.ir.remote.airLastSent')}
              </Typography>
            </>
          )}
          <AirFunctionTiles
            state={currentState}
            items={tileItems}
            busyId={clickedItem}
            onPress={handleItemClick}
            onLongPress={openKeyMenu}
            onReorder={onTileReorder}
          />
          {(gridItems.length > 0 || canLearn) && (
            <>
              <Typography sx={{ mt: 3.5, mb: 1.25, px: 0.5, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                {t('pages.ir.remote.moreKeys')}
              </Typography>
              <SortableKeyGrid
                items={gridItems}
                gap={10}
                cellHeight={88}
                onReorder={onGridReorder}
                onLongPress={openMenu}
                trailing={
                  canLearn ? (
                    <Box
                      sx={(theme) => ({
                        height: '100%',
                        boxSizing: 'border-box',
                        borderRadius: '18px',
                        border: `1.5px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                      })}
                    >
                      <LearnKeyCell learning={isLearnMode} onClick={toggleLearnMode} />
                    </Box>
                  ) : null
                }
                renderItem={(item) => (
                  <Box
                    onClick={() => handleItemClick(item)}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 1,
                      borderRadius: '18px',
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      opacity: clickedItem === item.id ? 0.4 : 1,
                      transition: 'opacity 0.2s, transform 0.15s ease',
                      '&:active': { transform: 'scale(0.96)' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 15,
                        fontWeight: 600,
                        textAlign: 'center',
                        lineHeight: 1.25,
                        overflowWrap: 'anywhere',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.customName || item.title}
                    </Typography>
                  </Box>
                )}
              />
            </>
          )}
          <Box sx={{ mx: -2 }}>
            <KeyHints show={orderedItems.length > 0} />
          </Box>
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
              {t('pages.ir.remote.cannotControlAirConditionerAutoMatchRemote')} &gt;
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
          {`${getRemoteSource(remote, t)} ${remote?.alias ?? ''}`}
        </Typography>
      </Box>
      {menuElement}
    </Card>
  );
};

export default RemoteAir;
