import PageHeader from '@/components/PageHeader';
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
import { useAppOnlyNotice } from '@/hooks/useBleSnapshot';
import { rememberBleSnapshot } from '@/services/bleSnapshot';
import LockSettingWheel from './LockSettingWheel';
import BleStatusBar from './BleStatusBar';
import { lockSettingsInteraction } from './lockSettingsInteraction';
import { ios } from '@/theme/appHomeStyle';
import { groupCardSx, groupLabelSx, settingsHeaderSx } from './SettingsGroup';

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
        minHeight: 64,
        bgcolor: ios.card,
        gap: 1,
        '&:not(:last-child)': { boxShadow: `inset 0 -0.5px 0 ${ios.separator}` },
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
  return <BotScript deviceUUID={params.get('deviceUUID') || ''} index={Number(params.get('index'))} />;
}
export function BotScript({ deviceUUID, index, onBack, embedded = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  );
  const bot = useBotScripts(deviceUUID, undefined, false, true);
  const appOnly = useAppOnlyNotice();
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
    if (bot.readOnly) setScript(bot.scriptData?.[index] ?? null);
  }, [bot.readOnly, bot.scriptData, index]);
  useEffect(() => {
    if (!bot.connected || !Number.isInteger(index) || index < 0 || index > 9) return;
    let active = true;
    setBusy(true);
    setError(false);
    deviceService
      .request('botSettings', { deviceUUID, index, operation: 'read' })
      .then(({ data }) => {
        rememberBleSnapshot(deviceUUID, `script${index}`, { actions: data.actions });
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
    if (bot.readOnly) {
      appOnly();
      return;
    }
    if (busy || !bot.connected) return;
    setBusy(true);
    setError(false);
    try {
      const { data } = await deviceService.request('botSettings', { deviceUUID, index, operation: 'write', ...next });
      setScript(next);
      rememberBleSnapshot(deviceUUID, `script${index}`, { actions: next.actions });
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
  const disabled = busy || !(bot.connected || bot.readOnly) || !script || !!pendingCloud;
  return (
    <Box sx={{ ...lockSettingsInteraction, minHeight: embedded ? '100%' : '100dvh', bgcolor: ios.background }}>
      <PageHeader
        sx={{ ...settingsHeaderSx, pr: 2, ...(embedded && { pl: 0 }) }}
        onBack={onBack ?? (() => navigate(-1))}
        centerTitle={
          <Button
            disableRipple
            disabled={!script || busy}
            onClick={() => (bot.readOnly ? appOnly() : setRename(alias.replace(/^🎬\s*/, '')))}
            sx={{ minWidth: 0, p: 0, color: 'text.primary' }}
          >
            {alias} 🖊 ({script?.actions.length ?? 0}/20)
          </Button>
        }
        action={
          <IconButton
            disableRipple
            aria-label={t('botSettings.add')}
            disabled={disabled || script.actions.length >= 20}
            onClick={() => persist({ ...script, actions: [...script.actions, { type: 0, time: 0 }] })}
          >
            <AddCircleOutline />
          </IconButton>
        }
      />
      <BleStatusBar deviceUUID={deviceUUID} />
      <Typography sx={{ ...groupLabelSx, mx: '16px', pt: '12px', pb: '12px' }}>
        {t('botSettings.hint', {
          deviceName: bot.deviceName || params.get('deviceName') || 'Sesame Bot',
        })}
      </Typography>
      {error && (
        <Alert
          severity="error"
          sx={{ mx: '16px', mb: '12px', borderRadius: '12px' }}
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
          <Box sx={{ ...groupCardSx, mx: '16px', mb: '24px', display: script?.actions.length ? 'block' : 'none' }}>
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
                      color: ios.label,
                      fontWeight: 500,
                      fontSize: 17,
                    }}
                    onClick={() => {
                      if (bot.readOnly) return appOnly();
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
          </Box>
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
