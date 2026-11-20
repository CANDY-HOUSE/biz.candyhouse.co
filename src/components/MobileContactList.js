import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useTranslation } from 'react-i18next';
import { isAppHome } from '@/services/deviceService';
import { ios, appSearchSx, appSectionLabelSx } from '@/theme/appHomeStyle';
import { appStickySearchSx } from '@/services/appNavigation';
import { DataSearch } from './biz/device/DataSearch';
import Avatar from '@mui/material/Avatar';
import { biz3utils } from '@/utils/biz3utils';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  useSensor,
  MouseSensor,
  useSensors,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { cancelAppPullRefresh } from '@/services/appPullRefresh';
import { ContactsNavIcon } from './biz/layout/navIcons';

export const ContactsEmpty = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: 'text.disabled',
    }}
  >
    <ContactsNavIcon size={96} />
  </Box>
);

const SortableContactItem = ({ index, user, callRowClick, enableDrag }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: user.subUUID,
    disabled: !enableDrag,
  });

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const handleItemClick = () => {
    if (isDragging) return;
    callRowClick(index);
  };

  if (isAppHome) {
    return (
      <ListItem
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleItemClick}
        style={style}
        sx={{
          minHeight: 64,
          pl: '16px',
          pr: '12px',
          bgcolor: ios.card,
          position: 'relative',
          zIndex: isDragging ? 1 : undefined,
          borderRadius: isDragging ? '14px' : 0,
          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.14)' : 'none',
          '&:active': { bgcolor: isDragging ? ios.card : '#E5E5EA' },
          '&:not(:last-of-type)::after': {
            content: '""',
            position: 'absolute',
            left: 72,
            right: 0,
            bottom: 0,
            height: '0.5px',
            bgcolor: ios.separator,
          },
        }}
      >
        <Avatar
          variant="circular"
          sx={{
            width: 42,
            height: 42,
            mr: '14px',
            background: 'linear-gradient(180deg, #A5ABB8 0%, #858994 100%)',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {user.employeeName?.charAt(0)?.toUpperCase() ?? ''}
        </Avatar>
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 17,
            color: ios.label,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user.employeeName}
        </Typography>
        <KeyboardArrowRightIcon sx={{ fontSize: 22, color: ios.tertiaryLabel, flexShrink: 0 }} />
      </ListItem>
    );
  }

  return (
    <ListItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleItemClick}
      style={style}
      sx={{
        ...style,
      }}
    >
      <ListItemAvatar>
        <Avatar variant="circular" sx={{ bgcolor: 'info.light' }}>
          {user.employeeName?.charAt(0)?.toUpperCase() ?? ''}
        </Avatar>
      </ListItemAvatar>
      <ListItemText primary={user.employeeName} />
    </ListItem>
  );
};

const MobileContactList = ({ contacts, isEmpty, callRowClick, callSearch, onDragEnd }) => {
  const { t } = useTranslation();
  const [sortableData, setSortableData] = useState(contacts);

  useEffect(() => {
    setSortableData(contacts);
  }, [contacts]);

  useEffect(() => {
    const scheme = `ssm://UI/webview/registNotify?${new URLSearchParams({
      notifyName: 'RefreshList',
    })}`;
    biz3utils.triggerScheme(scheme);
  }, []);

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortableData.findIndex((user) => user.subUUID === active.id);
      const newIndex = sortableData.findIndex((user) => user.subUUID === over.id);
      const updatedContacts = arrayMove(sortableData, oldIndex, newIndex);
      setSortableData(updatedContacts);
      onDragEnd && onDragEnd(updatedContacts, oldIndex, newIndex);
    }
  };

  if (isEmpty) {
    return <ContactsEmpty />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={cancelAppPullRefresh}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={sortableData.map((user) => user.subUUID)} strategy={verticalListSortingStrategy}>
        <Box sx={{ width: '100%', bgcolor: isAppHome ? undefined : 'background.paper' }}>
          <Box sx={isAppHome ? appStickySearchSx : { p: '16px', pb: '8px' }}>
            <DataSearch
              callSearch={callSearch}
              placeholder={isAppHome ? t('appHome.searchContacts') : undefined}
              sx={isAppHome ? appSearchSx : undefined}
            />
          </Box>
          {isAppHome && (
            <Typography sx={appSectionLabelSx}>{t('appHome.contactCount', { count: sortableData.length })}</Typography>
          )}
          <List
            disablePadding={isAppHome}
            sx={
              isAppHome
                ? { mx: '16px', mb: '16px', bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden' }
                : undefined
            }
            onTouchMoveCapture={() => {
              if (isAppHome && document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
            }}
          >
            {sortableData.map((user, index) => (
              <SortableContactItem
                key={user.subUUID}
                index={index}
                user={user}
                callRowClick={callRowClick}
                enableDrag={!!onDragEnd}
              />
            ))}
          </List>
        </Box>
      </SortableContext>
    </DndContext>
  );
};

export default MobileContactList;
