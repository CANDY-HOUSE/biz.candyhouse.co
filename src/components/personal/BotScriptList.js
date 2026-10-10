import React, { useState } from 'react';
import { Box, Button, IconButton } from '@mui/material';
import { lockSettingsInteraction } from '../lockSettingsInteraction';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

function ScriptRow({ script, onRun, disabled }) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: script.id, disabled });
  return (
    <Box
      ref={setNodeRef}
      sx={{ display: 'flex', transform: transform ? `translateY(${transform.y}px)` : undefined, transition }}
    >
      <Button
        disabled={disabled}
        onClick={() => onRun(script.id)}
        {...attributes}
        {...listeners}
        disableRipple
        sx={{
          flex: 1,
          justifyContent: 'flex-start',
          color: 'text.primary',
          touchAction: 'pan-y',
          fontSize: 17,
          '&.Mui-disabled': { color: 'text.primary' },
        }}
      >
        {script.name}
      </Button>
      <IconButton
        disabled={disabled}
        onClick={() => onRun(script.id)}
        disableRipple
        aria-label={script.name}
        sx={{
          width: 104,
          flexShrink: 0,
          mr: '-8px',
          color: 'primary.main',
          '&.Mui-disabled': { color: 'primary.main' },
        }}
      >
        <PlayArrowIcon />
      </IconButton>
    </Box>
  );
}

export default function BotScriptList({ scripts, onRun, onError, onReorder }) {
  const [busy, setBusy] = useState(false);
  const orderedScripts = scripts;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const run = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      await onRun(id);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };
  const reorder = async ({ active, over }) => {
    if (!over || active.id === over.id || busy) return;
    const ids = orderedScripts.map((script) => script.id);
    setBusy(true);
    try {
      const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
      await onReorder(next);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ ...lockSettingsInteraction, px: 3, pb: 1 }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={reorder}
      >
        <SortableContext items={orderedScripts.map((script) => script.id)} strategy={verticalListSortingStrategy}>
          {orderedScripts.map((script) => (
            <ScriptRow key={script.id} script={script} onRun={run} disabled={busy} />
          ))}
        </SortableContext>
      </DndContext>
    </Box>
  );
}
