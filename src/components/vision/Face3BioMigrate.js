import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';

/** 迁移进行中多久查一次状态。新设备要醒着、联网才会领取, 不必刷太勤。 */
const POLL_MS = 5000;
const ACTIVE = new Set(['pending', 'copied']);

/* 云端错误码 -> 文案键 */
const ERROR_KEYS = {
  not_backup_owner: 'face3.migrate.errNotOwner',
  target_not_owned: 'face3.migrate.errTargetNotOwned',
  no_backup: 'face3.migrate.errNoBackup',
  migration_in_progress: 'face3.migrate.errInProgress',
  source_busy: 'face3.migrate.errSourceBusy',
  not_cancellable: 'face3.migrate.errNotCancellable',
  not_authenticated: 'face3.errNotAuthenticated',
  login_required: 'face3.errNotAuthenticated',
  timeout: 'face3.errTimeout',
};

/**
 * 人脸掌纹换机迁移: 把旧设备云备份里的人脸/掌纹(连同名字)导入到这台(新)设备。
 *
 * 流程在云端与设备之间完成(Face3_qr bioMigrate*): 这里只负责选来源、发起、看进度、取消。
 * 新设备库里 0 人、登录着发起人的账号、联网醒着时自己领取; 算法模型版本不同的那一类不迁, 提示重录。
 */
export default function Face3BioMigrate({ device, devices, onClose }) {
  const { t } = useTranslation();
  const { gFace3 } = useContext(GlobalStateContext);
  const { listBioMigrateSources, startBioMigrate, getBioMigrateStatus, cancelBioMigrate } = gFace3;
  const target = device.deviceUUID.toUpperCase();
  const [sources, setSources] = useState(null);
  const [status, setStatus] = useState(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(new AbortController());
  useEffect(() => () => abortRef.current.abort(), []);

  const nameOf = useCallback(
    (uuid) => {
      const d = (devices || []).find((x) => (x.deviceUUID || '').toUpperCase() === uuid);
      return d?.deviceName || uuid;
    },
    [devices]
  );
  const errorText = (res) => t(ERROR_KEYS[res?.message] || 'face3.errUnknown');

  const refreshStatus = useCallback(async () => {
    const res = await getBioMigrateStatus(target, abortRef.current.signal);
    if (res.message === 'cancelled') return null;
    const st = res.success ? res.data : null;
    setStatus(st);
    return st;
  }, [getBioMigrateStatus, target]);

  /* 打开时: 这台已有进行中的迁移就直接看进度, 否则列出可选的来源 */
  useEffect(() => {
    (async () => {
      const st = await refreshStatus();
      if (st && ACTIVE.has(st.state)) return;
      const res = await listBioMigrateSources(abortRef.current.signal);
      if (res.message === 'cancelled') return;
      if (!res.success) {
        setError(errorText(res));
        setSources([]);
        return;
      }
      setSources((res.data?.devices || []).filter((d) => d.deviceId !== target));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 进行中轮询进度 */
  const active = status && ACTIVE.has(status.state);
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshStatus();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [active, refreshStatus]);

  const start = async () => {
    if (!picked) return;
    setBusy(true);
    setError('');
    const res = await startBioMigrate(picked.deviceId, target, abortRef.current.signal);
    setBusy(false);
    if (res.message === 'cancelled') return;
    if (!res.success) {
      setError(errorText(res));
      return;
    }
    await refreshStatus();
  };

  const cancel = async () => {
    setBusy(true);
    setError('');
    const res = await cancelBioMigrate(target, abortRef.current.signal);
    setBusy(false);
    if (res.message === 'cancelled') return;
    if (!res.success) setError(errorText(res));
    await refreshStatus();
  };

  const kindLabel = (k) => t(k === 'palm' ? 'face3.migrate.palm' : 'face3.migrate.face');
  const countsText = (c = {}) => t('face3.migrate.counts', { face: c.face || 0, palm: c.palm || 0 });

  const renderStatus = () => {
    const st = status.state;
    const from = nameOf(status.fromDeviceId);
    let severity = 'info';
    let text;
    if (st === 'pending') text = t('face3.migrate.statePending', { from });
    else if (st === 'copied') text = t('face3.migrate.stateCopied', { from });
    else if (st === 'done') {
      severity = 'success';
      text = t('face3.migrate.stateDone', { from, n: status.users ?? '-' });
    } else if (st === 'model_mismatch') {
      severity = 'warning';
      text = t('face3.migrate.stateModelMismatch');
    } else if (st === 'failed') {
      severity = 'error';
      text = t(
        status.reason === 'target_not_empty' ? 'face3.migrate.stateTargetNotEmpty' : 'face3.migrate.stateFailed'
      );
    } else if (st === 'cancelled') text = t('face3.migrate.stateCancelled');
    else if (st === 'expired') {
      severity = 'warning';
      text = t('face3.migrate.stateExpired');
    }
    const mismatch = status.mismatch || [];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Alert severity={severity} icon={active ? <CircularProgress size={18} /> : undefined}>
          {text}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          {countsText(status.counts)}
        </Typography>
        {mismatch.length > 0 && (
          <Alert severity="warning">
            {t('face3.migrate.partialMismatch', { kinds: mismatch.map(kindLabel).join(' / ') })}
          </Alert>
        )}
      </Box>
    );
  };

  const renderSources = () => {
    if (sources === null) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2">{t('face3.migrate.intro', { to: nameOf(target) })}</Typography>
        <Alert severity="info">{t('face3.migrate.needBackup')}</Alert>
        {sources.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('face3.migrate.noSources')}
          </Typography>
        ) : (
          <List dense disablePadding>
            {sources.map((d) => (
              <ListItemButton
                key={d.deviceId}
                selected={picked?.deviceId === d.deviceId}
                disabled={!!d.migratingTo && d.migratingTo !== target}
                onClick={() => setPicked(d)}
              >
                <ListItemText primary={nameOf(d.deviceId)} secondary={countsText(d.counts)} />
              </ListItemButton>
            ))}
          </List>
        )}
        {picked && (
          <Typography variant="body2">{t('face3.migrate.confirm', { from: nameOf(picked.deviceId) })}</Typography>
        )}
      </Box>
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('face3.migrate.title')}
        <IconButton aria-label={t('face3.cancel')} onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        {status && <Box sx={{ mb: active ? 0 : 2 }}>{renderStatus()}</Box>}
        {!active && renderSources()}
      </DialogContent>
      <DialogActions>
        {active && status.state === 'pending' && (
          <Button color="error" disabled={busy} onClick={cancel}>
            {t('face3.migrate.cancel')}
          </Button>
        )}
        {!active && (
          <Button variant="contained" disabled={busy || !picked} onClick={start}>
            {busy ? <CircularProgress size={18} /> : t('face3.migrate.start')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
