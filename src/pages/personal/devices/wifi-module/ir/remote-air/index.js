// src/components/AirConditionerRemote.js
import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, Box, Typography, IconButton, Paper } from '@mui/material';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import { useRemoteCtrl } from '@/api/useRemoteCtrl.js';
import { HXDParametersSwapper } from '../utils/HXDParametersSwapper';
import { HXDCommandProcessor } from '../utils/HXDCommandProcessor';
import { getRemoteSource, getAirTempRange, clampAirTemp } from '../utils/irRemoteUtils.js';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import EditableText from '@/components/EditableText.js';
import { useTranslation } from 'react-i18next';
import { biz3utils } from '@/utils/biz3utils.js';

import {
  AirModelAuto,
  AirModelCold,
  AirModelDry,
  AirModelHot,
  AirModelWind,
  AirTempAdd,
  AirTempReduce,
  AirWindHorizontalAuto,
  AirWindHorizontalStop,
  AirWindSpeedAuto,
  AirWindSpeedV1,
  AirWindSpeedV2,
  AirWindSpeedV3,
  AirWindVerticalV1,
  AirWindVerticalV2,
  AirWindVerticalV3,
  PowerOn,
  PowerOff,
} from '@assets/svg/ir/svgIR.js';

import SortableKeyGrid from '../components/SortableKeyGrid.js';
import { useKeyOrder } from '../hooks/useKeyOrder.js';
import { useRemotePageFrame } from '../hooks/useRemotePageFrame.js';
import PageHeader, { pageHeaderTitleStyle } from '@/components/PageHeader';
import { useRemoteKeys } from '../hooks/useRemoteKeys.js';
import { useIrLearning } from '../hooks/useIrLearning.js';
import { KeyMoreButton, useKeyEditMenu } from '../components/KeyEditMenu.js';
import LearnHint from '../components/LearnHint.js';
import { KEY_KIND, mergeRemoteKeys, mapKeyIds } from '../utils/remoteKeys.js';

// 可以改名的空调控件：开机、关机。其余是组合控件（标题随状态变化，如温度、模式、风速），只能删除、不能改名
const AIR_RENAMABLE_IDS = ['power_on', 'power_off'];

const RemoteAir = () => {
  const navigate = useNavigate();
  const [currentState, setCurrentState] = useState({
    power: false,
    temperature: 25,
    mode: 1, // 0: 自动, 1: 制冷, 2: 除湿, 3: 送风, 4: 制热
    fanSpeed: 0, // 0: 自动, 1: 最小, 2: 中等, 3: 最大
    windDirection: 1, // 0: 向上, 1: 居中, 2: 向下
    autoSwing: true, // false: 停止摆风, true: 自动摆风
  });
  const [clickedItem, setClickedItem] = useState(null);
  const [searchParams] = useSearchParams();
  const hub3DeviceId = searchParams.get('hub3DeviceId');
  const parametersSwapper = useMemo(() => new HXDParametersSwapper(), []);
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
  const [remote, setRemote] = useState({});
  const [localRemoteAlias, setLocalRemoteAlias] = useState('');
  const [command, setCommand] = useState('');
  const [matchedRemotes, setMatchedRemotes] = useState([]);
  const { t } = useTranslation();
  const isMobile = gMediaType.isMobile;
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

  // 获取当前模式图标
  const getCurrentModeIcon = () => {
    switch (currentState.mode) {
      case 0:
        return AirModelAuto;
      case 1:
        return AirModelCold;
      case 2:
        return AirModelDry;
      case 3:
        return AirModelWind;
      case 4:
        return AirModelHot;
      default:
        return AirModelCold;
    }
  };

  // 获取当前风速图标
  const getCurrentFanSpeedIcon = () => {
    switch (currentState.fanSpeed) {
      case 0:
        return AirWindSpeedAuto;
      case 1:
        return AirWindSpeedV1;
      case 2:
        return AirWindSpeedV2;
      case 3:
        return AirWindSpeedV3;
      default:
        return AirWindSpeedAuto;
    }
  };

  // 获取当前风向图标
  const getCurrentWindDirectionIcon = () => {
    switch (currentState.windDirection) {
      case 0:
        return AirWindVerticalV1;
      case 1:
        return AirWindVerticalV2;
      case 2:
        return AirWindVerticalV3;
      default:
        return AirWindVerticalV2;
    }
  };

  // 获取摆风图标
  const getSwingIcon = () => {
    return currentState.autoSwing ? AirWindHorizontalAuto : AirWindHorizontalStop;
  };

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
        icon: currentState.power ? PowerOn : PowerOff,
        position: { row: 0, col: 0 },
        clickable: true,
      },
      {
        id: 'temperature_display',
        type: 'TEMPERATURE_DISPLAY',
        title: `${currentState.temperature}°C`,
        icon: null,
        position: { row: 0, col: 1 },
        clickable: false,
      },
      {
        id: 'power_off',
        type: 'POWER_OFF',
        title: t('pages.ir.remote.off'),
        icon: currentState.power ? PowerOff : PowerOn,
        position: { row: 0, col: 2 },
        clickable: true,
      },
      {
        id: 'temp_add',
        type: 'TEMP_ADD',
        title: t('pages.ir.remote.temperature'),
        icon: AirTempAdd,
        position: { row: 1, col: 0 },
        clickable: true,
      },
      {
        id: 'mode',
        type: 'MODE',
        title: getModeTitle(currentState.mode),
        icon: getCurrentModeIcon(),
        position: { row: 1, col: 1 },
        clickable: true,
      },
      {
        id: 'temp_reduce',
        type: 'TEMP_REDUCE',
        title: t('pages.ir.remote.temperature'),
        icon: AirTempReduce,
        position: { row: 1, col: 2 },
        clickable: true,
      },
      {
        id: 'fan_speed',
        type: 'FAN_SPEED',
        title: getFanSpeedTitle(currentState.fanSpeed),
        icon: getCurrentFanSpeedIcon(),
        position: { row: 2, col: 0 },
        clickable: true,
      },
      {
        id: 'wind_direction',
        type: 'WIND_DIRECTION',
        title: getWindDirectionTitle(currentState.windDirection),
        icon: getCurrentWindDirectionIcon(),
        position: { row: 2, col: 1 },
        clickable: true,
      },
      {
        id: 'auto_swing',
        type: 'AUTO_SWING',
        title: getSwingTitle(currentState.autoSwing),
        icon: getSwingIcon(),
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
  const { isLearnMode, toggleLearnMode, enterLearnMode } = useIrLearning({
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

  // 按键的「…」菜单：编辑名称（组合控件置灰）、删除
  const { openMenu, menuElement } = useKeyEditMenu({
    canRename: (item) => item.kind === KEY_KIND.LEARNED || AIR_RENAMABLE_IDS.includes(item.presetId ?? item.id),
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
              updateLocalRemoteList(hub3DeviceId, remote);
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
            {hasRemoteSave && !isFirstLevelFromApp && (
              <IconButton onClick={toggleLearnMode} sx={{ flexShrink: 0 }}>
                {isLearnMode ? <HighlightOffRoundedIcon /> : <AddCircleOutlineOutlinedIcon />}
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
              const IconComponent = item.icon;
              return (
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: item.clickable ? 'pointer' : 'default',
                    borderRadius: 0,
                    opacity: isClicked ? 0.3 : 1,
                    transition: 'opacity 0.2s',
                    margin: 0,
                    py: 1,
                    backgroundColor: 'transparent',
                    position: 'relative',
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <Box sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: '1rem', sm: '1.2rem' },
                      textAlign: 'center',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      px: 1,
                      overflowWrap: 'anywhere',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
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

                  <Box
                    sx={{
                      flex: 1,
                      width: '100%',
                      maxWidth: 140,
                      boxSizing: 'border-box',
                      px: 1,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      mb: '24px',
                    }}
                  >
                    {IconComponent ? (
                      <IconComponent opacity={isClicked ? 0.3 : 1} width="100%" height="auto" />
                    ) : (
                      <Box sx={{ height: 24 }} />
                    )}
                  </Box>
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
