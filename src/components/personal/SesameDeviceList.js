import { bleStateLabel } from '@/services/blePresentation';
import { logOperationFailure } from '@/services/operationFailure';
import { reportDeviceLocation } from '@/services/deviceLocation';
import { cancelAppPullRefresh } from '@/services/appPullRefresh';
import { useBotScripts } from '@/hooks/useBotScripts';
import { useAppOnlyNotice } from '@/hooks/useBleSnapshot';
import { isScriptBotModel } from '@/services/botScripts';
import { deviceService, isAppHome } from '@/services/deviceService';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import BotScriptList from './BotScriptList';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
  useContext,
} from 'react';
import { Box, ButtonBase, List, ListItem, ListItemText, Stack, Collapse, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import { BatteryBadge, BatteryLevel } from '../biz/device/BatteryLevel';
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
import { AirStatusSummary } from '@/pages/personal/devices/wifi-module/ir/components/AirRemoteStatus.js';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { ios, appSearchSx, appSectionLabelSx, homeCards, hoverSx } from '@/theme/appHomeStyle';
import { appStickySearchSx } from '@/services/appNavigation';
import { useTranslation } from 'react-i18next';
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

const nameSize = 20;
const nameMinSize = 12;

// Shrinks a long name to stay on one line; it measures against the row, whose width the font never changes.
const FitName = ({ children }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const fit = () => {
      el.style.fontSize = `${nameSize}px`;
      if (el.scrollWidth <= el.clientWidth) return;
      let size = Math.max(nameMinSize, Math.floor((nameSize * el.clientWidth * 2) / el.scrollWidth) / 2);
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth && size > nameMinSize) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, [children]);
  return (
    <Typography
      ref={ref}
      sx={{
        minWidth: 0,
        fontSize: nameSize,
        fontWeight: 600,
        lineHeight: '27px',
        color: ios.label,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </Typography>
  );
};

const SortableItemComponent = ({
  index,
  device,
  callRowClick,
  gIot,
  enableDrag,
  expandedDevices,
  toggleExpanded,
  isDragging,
  localOnly,
  selected,
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

  const nativeDevices = useSyncExternalStore(deviceService.subscribe, deviceService.getSnapshot);
  const native = isAppHome ? nativeDevices[device.deviceUUID.toUpperCase()] : null;
  const { setSnackbarValue, gStripe } = useContext(GlobalStateContext);
  const bot = useBotScripts(device.deviceUUID, device.deviceModel, localOnly);
  const isScriptBot = bot.enabled;
  const webScripts = !isAppHome && isScriptBotModel(device.deviceModel);
  const appOnly = useAppOnlyNotice();
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
  const isExpanded = !(isAppHome && isDragging) && expandedDevices.includes(device.deviceUUID);
  const { t } = useTranslation();
  // Hub3 与 Hub3 Pro 都有遥控器列表，共用展开箭头逻辑
  const isHub3 = device.deviceModel === 'hub_3' || gUtils.isHub3Pro(device.deviceModel);

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  };

  // 带着选中进来（如从视觉页点卡片）时把这台滚到可见处；在列表里点选不滚
  const cardRef = useRef(null);
  const setCardRef = useCallback(
    (node) => {
      setNodeRef(node);
      cardRef.current = node;
    },
    [setNodeRef]
  );
  useEffect(() => {
    if (selected) cardRef.current?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (isHub3 && isExpanded && !isAppHome) {
      toggleExpanded(device.deviceUUID);
    }
    callRowClick?.(index);
  };

  const handleSwitchClick = (e) => {
    e.stopPropagation();
  };

  const expandable = !localOnly && (isHub3 || isScriptBot || webScripts);
  const statusColor = (on) => (on ? 'rgba(60,60,67,0.85)' : ios.tertiaryLabel);
  const batteryLevel = native?.bleConnected
    ? (native.batteryPercentage ?? device.stateInfo.batteryPercentage)
    : device.stateInfo.batteryPercentage;
  const hasFwUpdate =
    device.stateInfo?.currentFwVer && device.stateInfo?.currentFwVer !== device.stateInfo?.latestFwVer;

  return (
    <Box
      ref={homeCards ? setCardRef : undefined}
      style={homeCards ? style : undefined}
      sx={
        homeCards
          ? {
              mb: '12px',
              bgcolor: ios.card,
              borderRadius: ios.cardRadius,
              overflow: 'hidden',
              position: 'relative',
              zIndex: sortableIsDragging ? 1 : undefined,
              boxShadow: sortableIsDragging
                ? '0 8px 24px rgba(0,0,0,0.12)'
                : selected
                  ? `inset 0 0 0 2px ${ios.tint}`
                  : 'none',
              transition: 'box-shadow 0.2s ease',
            }
          : undefined
      }
    >
      <ListItem
        ref={homeCards ? undefined : setNodeRef}
        {...(enableDrag ? attributes : {})}
        {...(enableDrag ? listeners : {})}
        onClick={handleItemClick}
        style={homeCards ? undefined : style}
        sx={
          homeCards
            ? {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: expandable ? 'flex-start' : 'center',
                minHeight: expandable ? 0 : 104,
                pl: '20px',
                pr: '10px',
                pt: '14px',
                pb: expandable ? 0 : '14px',
                cursor: callRowClick ? 'pointer' : undefined,
                transition: 'background-color 0.2s ease',
                '&:active:not(:has(button:active))': { bgcolor: ios.pressed },
                ...hoverSx({ bgcolor: ios.pressed }),
              }
            : {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '5rem',
                ...style,
              }
        }
      >
        {homeCards ? (
          <Box sx={{ flexGrow: 1, minWidth: 0, pt: expandable ? '11px' : 0 }}>
            <Stack direction="row" spacing="10px" alignItems="center" sx={{ minHeight: 22 }}>
              {native?.showBle && <BluetoothIcon sx={{ fontSize: 19, color: statusColor(native.bleConnected) }} />}
              <WifiIcon sx={{ fontSize: 20, color: statusColor(device.stateInfo.wm2State === true) }} />
              <BatteryBadge level={batteryLevel} />
              {hasFwUpdate && <Error sx={{ color: 'error.main', fontSize: 19 }} />}
            </Stack>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, mt: '8px' }}>
              <FitName>{device.deviceName}</FitName>
            </Box>
            {native?.showBle && !native.bleConnected && native.bleState && native.bleState !== 'noBleSignal' && (
              <Typography sx={{ display: 'block', mt: '4px', fontSize: 13, color: ios.tertiaryLabel }}>
                {bleStateLabel(native.bleState)}
              </Typography>
            )}
          </Box>
        ) : (
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
              {!localOnly && (isHub3 || isScriptBot || webScripts) && (
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
                {bleStateLabel(native.bleState)}
              </Typography>
            )}
          </Box>
        )}
        <Box
          // With a footer row the button keeps the plain card's position and may reach into the footer's height.
          sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, mb: homeCards && expandable ? '-10px' : 0 }}
          onClick={handleSwitchClick}
        >
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
                {...appSwitchProps}
              />
              <VIotSwitch
                model={device.deviceModel}
                deviceUUID={device.deviceUUID}
                gIot={gIot}
                relayIndex={2}
                relayEnabled={!localOnly && getRelayEnabled(device, 2)}
                defaultState={getRelayLockState(device, 2)}
                shareKey={device.secretKey}
                {...appSwitchProps}
              />
            </>
          ) : (
            <>
              {/* Hub3 右侧没有开关：示意空调遥控器的状态，点击展开遥控器列表 */}
              {!localOnly && device.deviceModel === 'hub_3' && (
                <AirStatusSummary
                  remoteList={device.stateInfo?.remoteList}
                  onExpand={() => {
                    if (!isExpanded && !sortableIsDragging) toggleExpanded(device.deviceUUID);
                  }}
                  sx={homeCards ? { mt: '36px', mr: '6px' } : { mr: 1 }}
                />
              )}
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
                botIndex={isScriptBot && !localOnly ? bot.selected : native?.scriptIndex}
                shareKey={device.secretKey}
                {...appSwitchProps}
              />
            </>
          )}
        </Box>
      </ListItem>
      {homeCards && expandable && (
        <ButtonBase
          {...(enableDrag ? listeners : {})}
          onClick={handleArrowClick}
          aria-expanded={isExpanded}
          sx={{
            width: '100%',
            justifyContent: 'flex-start',
            pt: '6px',
            pb: '16px',
            gap: '2px',
            pl: '20px',
            pr: '16px',
            fontSize: 16,
            fontWeight: 500,
            color: isExpanded ? ios.tint : ios.label,
            transition: 'background-color 0.2s ease, color 0.25s ease',
            '&:active': { bgcolor: ios.pressed },
            ...hoverSx({ bgcolor: ios.pressed }),
          }}
        >
          {t(isHub3 ? 'pages.ir.remote.remoteControl' : 'botSettings.script')}
          <KeyboardArrowDownRoundedIcon
            sx={{
              fontSize: 24,
              color: isExpanded ? ios.tint : ios.tertiaryLabel,
              transform: isExpanded ? 'none' : 'rotate(-90deg)',
              transition: `transform 0.3s ${ios.spring}, color 0.25s ease`,
            }}
          />
        </ButtonBase>
      )}

      {!localOnly && (isScriptBot || webScripts) && !sortableIsDragging && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={homeCards ? appExpandedSx : undefined}>
          <BotScriptList
            deviceUUID={device.deviceUUID}
            scripts={bot.scripts}
            onReorder={webScripts ? appOnly : bot.reorder}
            onError={reportError}
            onRun={(scriptIndex) =>
              webScripts && device.stateInfo?.wm2State !== true
                ? appOnly()
                : native?.bleConnected
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
        <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={homeCards ? appExpandedSx : undefined}>
          <Box sx={homeCards ? { px: 3, pb: 1 } : { pl: 2, pr: 2, pb: 1 }}>
            <MobileHub3RemoteList deviceUUID={device.deviceUUID} device={device} editable={false} />
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

const appSwitchProps = homeCards ? { tinted: true, size: 62 } : {};
const appExpandedSx = {
  // Line the script play buttons up under the card's main button.
  '& .MuiIconButton-root': { width: 60 },
};

const expandedStorageKey = 'appHome.expandedDevices';

const loadExpandedDevices = () => {
  if (!isAppHome) return [];
  try {
    return JSON.parse(localStorage.getItem(expandedStorageKey)) || [];
  } catch (_) {
    return [];
  }
};

const SesameDeviceList = ({ devices, gIot, callRowClick, onDragEnd, callSearch, localOnly = false, selectedUUID }) => {
  const { t } = useTranslation();
  const [sortableData, setSortableData] = useState(devices);
  const [expandedDevices, setExpandedDevices] = useState(loadExpandedDevices); // 存储展开的设备 UUID
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
    if (!isAppHome) setExpandedDevices([]);
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
    setExpandedDevices((prev) => {
      const next = prev.includes(deviceUUID) ? prev.filter((uuid) => uuid !== deviceUUID) : [...prev, deviceUUID];
      if (isAppHome) {
        try {
          localStorage.setItem(expandedStorageKey, JSON.stringify(next));
        } catch (_) {
          // Only the next launch loses the expanded rows.
        }
      }
      return next;
    });
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
        <Box sx={{ width: '100%', bgcolor: homeCards ? undefined : 'background.paper' }}>
          <Box
            sx={
              isAppHome
                ? appStickySearchSx
                : homeCards
                  ? { px: '16px', pt: '4px', pb: '8px' }
                  : { p: '16px', pb: '8px' }
            }
          >
            <DataSearch
              callSearch={callSearch}
              placeholder={homeCards ? t('appHome.searchDevices') : undefined}
              sx={homeCards ? appSearchSx : undefined}
            />
          </Box>
          {homeCards && (
            <Typography sx={appSectionLabelSx}>{t('appHome.deviceCount', { count: sortableData.length })}</Typography>
          )}
          <List
            disablePadding
            sx={homeCards ? { px: '16px', pb: '16px' } : undefined}
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
                selected={device.deviceUUID === selectedUUID}
              />
            ))}
          </List>
        </Box>
      </SortableContext>
    </DndContext>
  );
};

export default SesameDeviceList;
