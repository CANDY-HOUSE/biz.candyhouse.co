import { useTranslation } from 'react-i18next';
import { bleStateLabel } from '@/services/blePresentation';
import { logOperationFailure } from '@/services/operationFailure';
import { reportDeviceLocation } from '@/services/deviceLocation';
import { cancelAppPullRefresh } from '@/services/appPullRefresh';
import { useBotScripts } from '@/hooks/useBotScripts';
import { deviceService, isAppHome } from '@/services/deviceService';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import BotScriptList from './BotScriptList';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import React, { useState, useEffect, useSyncExternalStore, useContext } from 'react';
import { Box, List, ListItem, ListItemText, Stack, Collapse, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import { BatteryLevel } from '../biz/device/BatteryLevel';
import VIotSwitch from '../biz/device/VIotSwitch';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  MouseSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { DataSearch } from '../biz/device/DataSearch';
import MobileHub3RemoteList from '@/components/MobileHub3RemoteList';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { gUtils } from '@/utils/gUtils';
import { Error } from '@mui/icons-material';

const getDeviceLockState = (device) => {
  if (device.stateInfo?.hasOwnProperty('wm2State') && device.stateInfo.wm2State !== true) {
    return undefined;
  }
  if (gUtils.isHub3Pro(device.deviceModel)) {
    return device.stateInfo?.relayStatus === 1 ? 'unlocked' : 'locked';
  }
  return device.stateInfo.CHSesame2Status;
};

// Hub3 Pro 分路继电器状态：relayIndex = 1 / 2
const getRelayLockState = (device, relayIndex) => {
  // 设备离线（wm2State !== true）时置为未知（灰色）
  if (device.stateInfo?.hasOwnProperty('wm2State') && device.stateInfo.wm2State !== true) {
    return undefined;
  }
  const info = device.stateInfo?.relayInfo || {};
  let status = info[`status${relayIndex}`];
  // 兼容旧数据：relayInfo 缺失时，第一路退回旧字段 relayStatus
  if (status === undefined && relayIndex === 1) {
    status = device.stateInfo?.relayStatus;
  }
  return Number(status) === 1 ? 'unlocked' : 'locked';
};

// Hub3 Pro 某一路是否使能（缺省视为已使能：添加设备时后台已写 enable=1，旧设备缺省也按开启兜底）
const getRelayEnabled = (device, relayIndex) => {
  const info = device.stateInfo?.relayInfo || {};
  const enable = info[`enable${relayIndex}`];
  return enable === undefined ? true : Number(enable) === 1;
};

const SortableItemComponent = ({
  index,
  device,
  callRowClick,
  gIot,
  enableDrag,
  expandedDevices,
  toggleExpanded,
  localOnly,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: device.deviceUUID,
    disabled: !enableDrag,
  });

  const { t } = useTranslation();
  const nativeDevices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = isAppHome ? nativeDevices[device.deviceUUID.toUpperCase()] : null;
  const { setSnackbarValue, gStripe } = useContext(GlobalStateContext);
  const bot = useBotScripts(device.deviceUUID, device.deviceModel, localOnly);
  const isScriptBot = bot.enabled;
  const reportError = (error) => {
    if (localOnly) return logOperationFailure('SesameDeviceList', 'localCommand');
    setSnackbarValue({
      logScope: 'components/personal/SesameDeviceList.reportError',
      severity: 'error',
      open: true,
      msg: error.message,
    });
  };
  const runNative = (scriptIndex) =>
    deviceService
      .request('command', { deviceUUID: device.deviceUUID, ...(scriptIndex === undefined ? {} : { scriptIndex }) })
      .catch(reportError);
  const shownDevice = native?.bleConnected
    ? {
        ...device,
        stateInfo: { ...device.stateInfo, wm2State: true, CHSesame2Status: native.bleState.toLowerCase() },
      }
    : device;
  const isExpanded = expandedDevices.includes(device.deviceUUID);
  // Hub3 与 Hub3 Pro 都有遥控器列表，共用展开箭头逻辑
  const isHub3 = device.deviceModel === 'hub_3' || gUtils.isHub3Pro(device.deviceModel);

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  };

  // 处理箭头图标点击事件
  const handleArrowClick = (e) => {
    e.stopPropagation();
    if (sortableIsDragging) return;
    toggleExpanded(device.deviceUUID);
    if (isScriptBot && !isExpanded)
      deviceService.request('scripts', { deviceUUID: device.deviceUUID }).catch(reportError);
  };

  // 处理整个 item 点击事件
  const handleItemClick = (_e) => {
    if (sortableIsDragging) return;

    if (isHub3 && isExpanded) {
      toggleExpanded(device.deviceUUID);
    }
    callRowClick?.(index);
  };

  const handleSwitchClick = (e) => {
    e.stopPropagation();
  };

  return (
    <Box>
      <ListItem
        ref={setNodeRef}
        {...(enableDrag ? attributes : {})}
        {...(enableDrag ? listeners : {})}
        onClick={handleItemClick}
        style={style}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: isAppHome ? '7rem' : '5rem',
          ...style,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing="5px" alignItems="center">
            {native?.showBle && (
              <BluetoothIcon fontSize="small" sx={{ color: native.bleConnected ? 'primary.main' : 'info.light' }} />
            )}
            <WifiIcon
              fontSize="small"
              sx={{ color: device.stateInfo.wm2State === true ? 'primary.main' : 'info.light' }}
            />
            <BatteryLevel
              level={
                native?.bleConnected
                  ? (native.batteryPercentage ?? device.stateInfo.batteryPercentage)
                  : device.stateInfo.batteryPercentage
              }
            />
            {device.stateInfo?.currentFwVer && device.stateInfo?.currentFwVer !== device.stateInfo?.latestFwVer && (
              <Error sx={{ color: 'error.main', fontSize: 16 }} />
            )}
          </Stack>
          <Stack direction="row" spacing="0px" alignItems="center">
            {!localOnly && (isHub3 || isScriptBot) && (
              <Box
                onClick={handleArrowClick}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 'auto',
                }}
              >
                <ArrowDropUpIcon
                  fontSize="small"
                  sx={{
                    width: '32px',
                    height: '32px',
                    marginRight: '-4px',
                    marginLeft: '-8px',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(90deg)',
                    transition: 'transform 0.2s ease-in-out',
                  }}
                />
              </Box>
            )}
            <ListItemText primary={device.deviceName} />
          </Stack>
          {native?.showBle && !native.bleConnected && native.bleState && native.bleState !== 'noBleSignal' && (
            <Typography variant="caption" color="text.disabled">
              {bleStateLabel(native.bleState, t)}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }} onClick={handleSwitchClick}>
          {gUtils.isHub3Pro(device.deviceModel) ? (
            // Hub3 Pro：分开显示两路继电器 icon
            <>
              <VIotSwitch
                model={device.deviceModel}
                deviceUUID={device.deviceUUID}
                gIot={gIot}
                relayIndex={1}
                relayEnabled={!localOnly && getRelayEnabled(device, 1)}
                defaultState={getRelayLockState(device, 1)}
                shareKey={device.secretKey}
              />
              <VIotSwitch
                model={device.deviceModel}
                deviceUUID={device.deviceUUID}
                gIot={gIot}
                relayIndex={2}
                relayEnabled={!localOnly && getRelayEnabled(device, 2)}
                defaultState={getRelayLockState(device, 2)}
                shareKey={device.secretKey}
              />
            </>
          ) : (
            <VIotSwitch
              model={device.deviceModel}
              deviceUUID={device.deviceUUID}
              gIot={gIot}
              defaultState={getDeviceLockState(shownDevice)}
              onCommandStart={
                isAppHome && !localOnly
                  ? () => {
                      reportDeviceLocation(device, gStripe.customerInfo.subUUID);
                    }
                  : undefined
              }
              disabled={localOnly && !native?.bleConnected}
              onCommand={
                native?.bleConnected
                  ? () => runNative(isScriptBot ? (localOnly ? native.scriptIndex : bot.selected) : undefined)
                  : undefined
              }
              position={
                native?.bleConnected
                  ? native.position
                  : device.stateInfo?.wm2State === true && Number.isFinite(device.stateInfo?.position)
                    ? Math.trunc((device.stateInfo.position * 360) / 1024)
                    : undefined
              }
              large={isAppHome}
              botIndex={isScriptBot && !localOnly ? bot.selected : native?.scriptIndex}
              shareKey={device.secretKey}
            />
          )}
        </Box>
      </ListItem>

      {!localOnly && isScriptBot && !sortableIsDragging && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <BotScriptList
            deviceUUID={device.deviceUUID}
            scripts={bot.scripts}
            onReorder={bot.reorder}
            onError={reportError}
            onRun={(scriptIndex) =>
              native.bleConnected
                ? runNative(scriptIndex)
                : gIot.sendCommandToWM2({
                    device_id: device.deviceUUID,
                    sescretKey: device.secretKey,
                    cmd: 170 + scriptIndex,
                  })
            }
          />
        </Collapse>
      )}
      {/* Hub3 设备的遥控器列表 - 拖拽时不显示 */}
      {!localOnly && isHub3 && !sortableIsDragging && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
            <MobileHub3RemoteList deviceUUID={device.deviceUUID} device={device} editable={false} />
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

const SesameDeviceList = ({ devices, gIot, callRowClick, onDragEnd, callSearch, localOnly = false }) => {
  const [sortableData, setSortableData] = useState(devices);
  const [expandedDevices, setExpandedDevices] = useState([]); // 存储展开的设备 UUID
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setSortableData(devices);
  }, [devices]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (_event) => {
    cancelAppPullRefresh();
    setIsDragging(true);
    setExpandedDevices([]);
  };

  const handleDragEnd = (event) => {
    setIsDragging(false);

    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortableData.findIndex((device) => device.deviceUUID === active.id);
      const newIndex = sortableData.findIndex((device) => device.deviceUUID === over.id);
      const updatedDevices = arrayMove(sortableData, oldIndex, newIndex);
      setSortableData(updatedDevices);
      onDragEnd && onDragEnd(updatedDevices, oldIndex, newIndex);
    }
  };

  const toggleExpanded = (deviceUUID) => {
    setExpandedDevices((prev) =>
      prev.includes(deviceUUID) ? prev.filter((uuid) => uuid !== deviceUUID) : [...prev, deviceUUID]
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setIsDragging(false)}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={sortableData.map((device) => device.deviceUUID)} strategy={verticalListSortingStrategy}>
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ p: '16px', pb: '8px' }}>
            <DataSearch callSearch={callSearch} />
          </Box>
          <List
            disablePadding
            onTouchMoveCapture={() => {
              if (isAppHome && document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
            }}
          >
            {sortableData.map((device, index) => (
              <SortableItemComponent
                key={device.deviceUUID}
                localOnly={localOnly}
                index={index}
                device={device}
                callRowClick={callRowClick}
                gIot={gIot}
                enableDrag={!!onDragEnd}
                expandedDevices={expandedDevices}
                toggleExpanded={toggleExpanded}
                isDragging={isDragging}
              />
            ))}
          </List>
        </Box>
      </SortableContext>
    </DndContext>
  );
};

export default SesameDeviceList;
