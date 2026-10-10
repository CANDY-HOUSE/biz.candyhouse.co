import PageHeader from '@/components/PageHeader';
import BackButton from '@/components/BackButton';
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Drawer,
  IconButton,
  ListItem,
  TextField,
  Typography,
} from '@mui/material';
import { AddCircleOutline, DeleteOutline, RotateRight, RotateLeft, Stop, Pause } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deviceService } from '@/services/deviceService';
import { useBotScripts } from '@/hooks/useBotScripts';
import LockSettingWheel from './LockSettingWheel';
import BleStatusBar from './BleStatusBar';
import { lockSettingsInteraction } from './lockSettingsInteraction';

const icons = [RotateRight, RotateLeft, Stop, Pause];
const times = Array.from({ length: 255 }, (_, i) => i + 1);
function ActionRow({ position, disabled, onDelete, children }) {
  const touch = useRef(null);
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: position, disabled });
  return (
    <ListItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onTouchStart={(event) => {
        listeners?.onTouchStart?.(event);
        const p = event.touches[0];
        touch.current = { x: p.clientX, y: p.clientY, at: Date.now() };
      }}
      onTouchEnd={(event) => {
        const start = touch.current;
        touch.current = null;
        const end = event.changedTouches[0];
        if (
          !disabled &&
          start &&
          Date.now() - start.at < 350 &&
          end.clientX - start.x < -80 &&
          Math.abs(end.clientY - start.y) < 40
        )
          onDelete();
      }}
      sx={{
        minHeight: 80,
        borderBottom: '1px solid #eee',
        gap: 1,
        touchAction: 'pan-y',
        transform: transform ? `translateY(${transform.y}px)` : undefined,
        transition,
      }}
    >
      {children}
    </ListItem>
  );
}
export default function AppBotScript() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  );
  const deviceUUID = params.get('deviceUUID') || '';
  const index = Number(params.get('index'));
  const bot = useBotScripts(deviceUUID);
  const { t } = useTranslation();
  const [script, setScript] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(null);
  const [rename, setRename] = useState(null);
  const [pendingCloud, setPendingCloud] = useState(null);
  const alias = bot.scripts.find((row) => row.id === index)?.name || `🎬 ${index}`;
  useEffect(() => {
    if (!bot.connected || !Number.isInteger(index) || index < 0 || index > 9) return;
    let active = true;
    setBusy(true);
    setError(false);
    deviceService
      .request('botSettings', { deviceUUID, index, operation: 'read' })
      .then(({ data }) => {
        if (active) setScript(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [deviceUUID, index, bot.connected, retry]);
  const persist = async (next) => {
    if (busy || !bot.connected) return;
    setBusy(true);
    setError(false);
    try {
      const { data } = await deviceService.request('botSettings', { deviceUUID, index, operation: 'write', ...next });
      setScript(next);
      setPendingCloud(data);
      await bot.save(index, { ...data, isDefault: 1 });
      setPendingCloud(null);
    } catch (_) {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const change = (position, patch) =>
    persist({
      ...script,
      actions: script.actions.map((action, i) => (i === position ? { ...action, ...patch } : action)),
    });
  const label = (value) =>
    value === 255 ? t('botSettings.forever') : t('botSettings.seconds', { value: (value / 10).toFixed(1) });
  const disabled = busy || !bot.connected || !script || !!pendingCloud;
  return (
    <Box sx={lockSettingsInteraction}>
      <BleStatusBar deviceUUID={deviceUUID} />
      <PageHeader sx={{ pl: 0, pr: 2 }}>
        <BackButton disableRipple onClick={() => navigate(-1)}></BackButton>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Button
            disableRipple
            disabled={!script || busy}
            onClick={() => setRename(alias.replace(/^🎬\s*/, ''))}
            sx={{ minWidth: 0, p: 0, color: 'text.primary' }}
          >
            {alias} 🖊 ({script?.actions.length ?? 0}/20)
          </Button>
        </Box>
        <IconButton
          disableRipple
          aria-label={t('botSettings.add')}
          disabled={disabled || script.actions.length >= 20}
          onClick={() => persist({ ...script, actions: [...script.actions, { type: 0, time: 0 }] })}
        >
          <AddCircleOutline />
        </IconButton>
      </PageHeader>
      <Typography sx={{ bgcolor: 'secondary.main', p: 2, color: 'text.secondary', whiteSpace: 'pre-line' }}>
        {t('botSettings.hint', {
          deviceName: bot.deviceName || params.get('deviceName') || 'Sesame Bot',
        })}
      </Typography>
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              disabled={busy}
              onClick={async () => {
                if (!pendingCloud) {
                  setRetry((n) => n + 1);
                  return;
                }
                setBusy(true);
                try {
                  await bot.save(index, { ...pendingCloud, isDefault: 1 });
                  setPendingCloud(null);
                  setError(false);
                } catch (_) {
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('lockSettings.retry')}
            </Button>
          }
        >
          {t('lockSettings.failed')}
        </Alert>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={({ active, over }) => {
          if (!disabled && over && active.id !== over.id)
            persist({ ...script, actions: arrayMove(script.actions, active.id, over.id) });
        }}
      >
        <SortableContext items={script?.actions.map((_, i) => i) || []} strategy={verticalListSortingStrategy}>
          {script?.actions.map((action, position) => {
            const Icon = icons[action.type];
            return (
              <ActionRow
                key={position}
                position={position}
                disabled={disabled}
                onDelete={() => persist({ ...script, actions: script.actions.filter((_, i) => i !== position) })}
              >
                <IconButton
                  disableRipple
                  disabled={disabled}
                  aria-label={t(`botSettings.type${action.type}`)}
                  onClick={() => change(position, { type: (action.type + 1) % 4 })}
                >
                  <Icon />
                </IconButton>
                <Button
                  disableRipple
                  disabled={disabled}
                  sx={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    color: 'text.secondary',
                    fontWeight: 'bold',
                    fontSize: 17,
                  }}
                  onClick={() => {
                    setEditing(position);
                    if (!action.time) change(position, { time: 1 });
                  }}
                >
                  {label(action.time)}
                </Button>
                <IconButton
                  disableRipple
                  disabled={disabled}
                  aria-label={t('pages.ir.remote.delete')}
                  onClick={() => persist({ ...script, actions: script.actions.filter((_, i) => i !== position) })}
                >
                  <DeleteOutline />
                </IconButton>
              </ActionRow>
            );
          })}
        </SortableContext>
      </DndContext>
      <Drawer anchor="bottom" open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && script?.actions[editing] && (
          <LockSettingWheel
            title={t('botSettings.duration')}
            visibleRows={7}
            values={times}
            value={script.actions[editing].time || 1}
            label={label}
            disabled={disabled}
            onChange={(time) => change(editing, { time })}
          />
        )}
      </Drawer>
      <Dialog open={rename !== null} onClose={() => !busy && setRename(null)}>
        <DialogContent>
          <TextField
            autoFocus
            value={rename || ''}
            onChange={(e) => setRename(e.target.value)}
            inputProps={{ maxLength: 250 }}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setRename(null)}>
            {t('deviceMember.opt.cancel')}
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await bot.save(index, { alias: `🎬 ${rename.replace(/^🎬\s*/, '').trim()}` });
                setRename(null);
              } catch (_) {
                setError(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
