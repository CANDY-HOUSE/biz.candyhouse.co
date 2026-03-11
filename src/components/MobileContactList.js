import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
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

const MobileContactList = ({ contacts, callRowClick, callSearch, onDragEnd }) => {
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
    if (active.id !== over.id) {
      const oldIndex = sortableData.findIndex((user) => user.subUUID === active.id);
      const newIndex = sortableData.findIndex((user) => user.subUUID === over.id);
      const updatedContacts = arrayMove(sortableData, oldIndex, newIndex);
      setSortableData(updatedContacts);
      onDragEnd && onDragEnd(updatedContacts, oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={sortableData.map((user) => user.subUUID)} strategy={verticalListSortingStrategy}>
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ p: '16px', pb: '8px' }}>
            <DataSearch callSearch={callSearch} />
          </Box>
          <List>
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
