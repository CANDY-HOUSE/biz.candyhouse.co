import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, Stack, Collapse } from '@mui/material';
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

const SortableItemComponent = ({ index, device, callRowClick, gIot, enableDrag, expandedDevices, toggleExpanded }) => {
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

  const isExpanded = expandedDevices.includes(device.deviceUUID);
  const isHub3 = device.deviceModel === 'hub_3';

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  };

  // 处理箭头图标点击事件
  const handleArrowClick = (e) => {
    e.stopPropagation();
    if (sortableIsDragging) return;
    toggleExpanded(device.deviceUUID);
  };

  // 处理整个 item 点击事件
  const handleItemClick = (_e) => {
    if (sortableIsDragging) return;

    if (isHub3 && isExpanded) {
      toggleExpanded(device.deviceUUID);
    }
    callRowClick(index);
  };

  const handleSwitchClick = (e) => {
    e.stopPropagation();
  };

  return (
    <Box>
      <ListItem
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleItemClick}
        style={style}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '5rem',
          ...style,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing="5px" alignItems="center">
            <WifiIcon
              fontSize="small"
              sx={{ color: device.stateInfo.wm2State === true ? 'primary.main' : 'info.light' }}
            />
            <BatteryLevel level={device.stateInfo.batteryPercentage} />
            {device.stateInfo?.currentFwVer && device.stateInfo?.currentFwVer !== device.stateInfo?.latestFwVer && (
              <Error sx={{ color: 'error.main', fontSize: 16 }} />
            )}
          </Stack>
          <Stack direction="row" spacing="5px" alignItems="center">
            {isHub3 && (
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
                    width: '26px',
                    height: '26px',
                    marginLeft: '-8px',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(90deg)',
                    transition: 'transform 0.2s ease-in-out',
                  }}
                />
              </Box>
            )}
            <ListItemText primary={device.deviceName} />
          </Stack>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }} onClick={handleSwitchClick}>
          <VIotSwitch
            model={device.deviceModel}
            deviceUUID={device.deviceUUID}
            gIot={gIot}
            defaultState={
              gUtils.isHub3LTE(device.deviceModel)
                ? device.stateInfo?.wm2State !== true
                  ? undefined
                  : device.stateInfo?.relayStatus === 1
                    ? 'unlocked'
                    : 'locked'
                : device.stateInfo.CHSesame2Status
            }
            shareKey={device.secretKey}
          />
        </Box>
      </ListItem>

      {/* Hub3 设备的遥控器列表 - 拖拽时不显示 */}
      {isHub3 && !sortableIsDragging && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
            <MobileHub3RemoteList deviceUUID={device.deviceUUID} editable={false} />
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

const SesameDeviceList = ({ devices, gIot, callRowClick, onDragEnd, callSearch }) => {
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
    setIsDragging(true);
    setExpandedDevices([]);
  };

  const handleDragEnd = (event) => {
    setIsDragging(false);

    const { active, over } = event;
    if (active.id !== over.id) {
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
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={sortableData.map((device) => device.deviceUUID)} strategy={verticalListSortingStrategy}>
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ p: '16px', pb: '8px' }}>
            <DataSearch callSearch={callSearch} />
          </Box>
          <List disablePadding>
            {sortableData.map((device, index) => (
              <SortableItemComponent
                key={device.deviceUUID}
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
