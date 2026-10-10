import PageHeader from '@/components/PageHeader';
import BackButton from '@/components/BackButton';
import { syncCredentials } from '@/services/credentialSync';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Close, Fingerprint, CreditCard, Dialpad, Face, BackHand } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@/context/GlobalContextProvider';
import { deviceService, isAppHome } from '@/services/deviceService';
import { appOperation } from '@/services/appOperations';
import {
  credentialItem,
  credentialDisplayId,
  credentialLabels,
  credentialPrefix,
  peripheralCapabilities,
} from '@/services/peripheralSettings';
import usePeripheralSettings from '@/hooks/usePeripheralSettings';
import BleStatusBar from './BleStatusBar';
import fingerImage from '@/assets/peripheral/gif_finger.gif';
import faceImage from '@/assets/peripheral/face_tips.png';
import faceProImage from '@/assets/peripheral/facepro_tips.png';
import palmImage from '@/assets/peripheral/palm_tips.png';
import palmProImage from '@/assets/peripheral/palmpro_tips.png';

export default function AppCredentials() {
  const { t } = useTranslation();
  const { gManageDevice, gStripe } = useContext(GlobalStateContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('deviceUUID') || '';
  const account = gStripe.customerInfo.subUUID;
  const kind = params.get('kind') || '';
  const device = gManageDevice.companyDevices.find((d) => d.deviceUUID?.toUpperCase() === id.toUpperCase());
  const model = device?.deviceModel || params.get('deviceModel');
  const supported = peripheralCapabilities(model).includes(kind);
  const { native, request, ready, session } = usePeripheralSettings(id);
  const current = native?.peripheral?.credentials;
  const data = current?.session === session && current.kind === kind ? current : null;
  const items = data?.items || [];
  const [names, setNames] = useState({});
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const alive = useRef(false);
  const queue = useRef(Promise.resolve());
  const revision = useRef(-1);
  const generation = useRef(0);
  const lastSynced = useRef(null);
  useEffect(() => {
    if (data?.loadFailed || data?.failureRevision > 0) setError(true);
  }, [data?.failureRevision, data?.loadFailed]);
  const limit = kind === 'card' ? 1000 : 100;
  const enqueue = (task) => {
    const next = queue.current.catch(() => {}).then(task);
    queue.current = next;
    return next;
  };
  useEffect(() => {
    alive.current = true;
    revision.current = -1;
    setNames({});
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [session, kind]);
  useEffect(() => {
    if (!isAppHome || !ready || !native?.bleConnected || !supported) return;
    let active = true;
    const attempt = ++generation.current;
    lastSynced.current = null;
    revision.current = -1;
    setError(false);
    request('credentials', { kind }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
      if (generation.current === attempt) generation.current++;
      deviceService.notify('peripheralSettings', { deviceUUID: id, operation: 'credentialsClose', session });
    };
  }, [ready, native?.bleConnected, session, supported, kind]);
  useEffect(() => {
    if (
      !data ||
      data.loading !== false ||
      data.loadFailed ||
      (!data.complete && data.revision === 0) ||
      data.revision === revision.current ||
      !native?.bleConnected
    ) {
      return;
    }
    revision.current = data.revision;
    const expected = generation.current;
    const list = data.items.map(credentialItem);
    setSyncing(true);
    enqueue(async () => {
      if (!alive.current || expected !== generation.current) return;
      const aliases = await syncCredentials({
        deviceUUID: id,
        account,
        kind,
        // ACK-only empty reads are not full lists. Newly enrolled items can still sync incrementally.
        previous: lastSynced.current ?? (data.complete ? null : []),
        items: list,
        isCurrent: () => alive.current && expected === generation.current,
      });
      if (alive.current && expected === generation.current) {
        lastSynced.current = list;
        setNames((old) => ({ ...old, ...aliases }));
      }
    })
      .catch(() => {
        if (alive.current && expected === generation.current) {
          lastSynced.current = null;
          setError(true);
        }
      })
      .finally(() => {
        if (alive.current) setSyncing(false);
      });
  }, [data?.complete, data?.loading, data?.loadFailed, data?.revision, native?.bleConnected]);
  const label = (item) =>
    names[item.credentialId.toUpperCase()] || credentialItem(item).name || t(`peripheral.default_${kind}`);
  const act = async (task) => {
    if (busy || !native?.bleConnected) return;
    setBusy(true);
    setError(false);
    try {
      await task();
    } catch (_) {
      if (alive.current) setError(true);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const rename = () =>
    act(async () => {
      const item = credentialItem(selected);
      const nameUUID = item.nameUUID || crypto.randomUUID();
      // Legacy plain-text names must first be replaced with a UUID on the physical device.
      if (!item.nameUUID) await request('credentialRename', { id: item.credentialId, nameUUID });
      const fields = {
        card: ['cardNameUUID', 'cardID'],
        fingerprint: ['fingerPrintNameUUID', 'fingerPrintID'],
        passcode: ['keyBoardPassCodeNameUUID', 'keyBoardPassCode'],
        face: ['faceNameUUID', 'faceID'],
        palm: ['palmNameUUID', 'palmID'],
      };
      const [nameKey, idKey] = fields[kind];
      await enqueue(() =>
        appOperation(
          'biometrics',
          {
            op: `${credentialPrefix(kind)}_putname`,
            [nameKey]: nameUUID,
            [idKey]: item.credentialId,
            name,
            ...(kind === 'card' ? { cardType: item.type } : { type: item.type }),
          },
          { deviceUUID: id, account }
        )
      );
      if (alive.current) {
        setNames((old) => ({ ...old, [item.credentialId.toUpperCase()]: name }));
        setEdit(false);
        setSelected(null);
      }
    });
  const remove = () =>
    act(async () => {
      await request('credentialDelete', { id: selected.credentialId });
      // Cloud sync follows the confirmed BLE list revision, including face/palm delete notifications.
      if (alive.current) setSelected(null);
    });
  const ItemIcon = { card: CreditCard, fingerprint: Fingerprint, passcode: Dialpad, face: Face, palm: BackHand }[kind];
  const plainFace = ['sesame_face', 'sesame_face_2'].includes(model);
  const illustration =
    kind === 'fingerprint'
      ? fingerImage
      : kind === 'face'
        ? plainFace
          ? faceImage
          : faceProImage
        : kind === 'palm'
          ? plainFace
            ? palmImage
            : palmProImage
          : null;
  if (!supported) return <Alert severity="warning">{t('peripheral.unsupported')}</Alert>;
  return (
    <Box sx={{ height: '100vh', overflow: 'auto', bgcolor: 'background.default' }}>
      <PageHeader>
        <BackButton onClick={() => navigate(-1)} aria-label={t('peripheral.back')}></BackButton>
        <Typography sx={{ flex: 1, textAlign: 'center' }}>
          {items.length}/{limit}
        </Typography>
        {(busy ||
          syncing ||
          (isAppHome && native?.bleConnected && data?.loading !== false && !error && !data?.loadFailed)) && (
          <CircularProgress size={20} />
        )}
        <IconButton
          disabled={
            !isAppHome ||
            busy ||
            !native?.bleConnected ||
            !data ||
            data.loading !== false ||
            data.loadFailed ||
            (data?.mode !== 1 && items.length >= limit)
          }
          aria-label={t(data?.mode === 1 ? 'peripheral.stopEnroll' : 'peripheral.enroll')}
          onClick={() =>
            act(() => request('credentialMode', { value: data?.mode === 1 ? (kind === 'fingerprint' ? 2 : 0) : 1 }))
          }
        >
          {data?.mode === 1 ? <Close /> : <Add />}
        </IconButton>
      </PageHeader>
      {isAppHome && <BleStatusBar deviceUUID={id} />}
      {!isAppHome && <Alert severity="info">Coming soon</Alert>}
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                revision.current = -1;
                setError(false);
                request('credentials', { kind })
                  .then(() => setError(false))
                  .catch(() => setError(true));
              }}
            >
              {t('peripheral.retry')}
            </Button>
          }
        >
          {t('lockSettings.failed')}
        </Alert>
      )}
      <Box sx={{ display: kind === 'fingerprint' ? 'flex' : 'block', alignItems: 'center', bgcolor: 'secondary.main' }}>
        {illustration && (
          <Box
            component="img"
            src={illustration}
            alt={t(`accessCtl.auth.${credentialLabels[kind]}`)}
            sx={{
              display: 'block',
              width: kind === 'fingerprint' ? 95 : 300,
              height: kind === 'fingerprint' ? 120 : 300,
              flexShrink: 0,
              objectFit: 'contain',
              mx: 'auto',
              maxWidth: '100%',
            }}
          />
        )}
        <Typography sx={{ p: 2, whiteSpace: 'pre-line' }}>
          {t(`peripheral.hint_${kind}`, { device: device?.deviceName || model })}
        </Typography>
      </Box>
      <List>
        {items.map((item) => (
          <Box key={item.credentialId}>
            <ListItem
              onClick={() => {
                setSelected(item);
                setName(label(item));
              }}
              sx={{ cursor: 'pointer' }}
            >
              <ItemIcon sx={{ fontSize: 44, color: 'text.secondary', mr: 1 }} />
              <ListItemText
                primary={label(item)}
                primaryTypographyProps={{ sx: { fontSize: 24, fontWeight: 600, color: 'text.secondary' } }}
                secondary={credentialDisplayId(kind, item.credentialId)}
              />
            </ListItem>
            <Divider variant="middle" />
          </Box>
        ))}
      </List>
      <Drawer anchor="bottom" open={!!selected && !edit} onClose={() => !busy && setSelected(null)}>
        <List>
          <ListItem>
            <ListItemText
              sx={{ textAlign: 'center', color: 'text.secondary' }}
              primary={selected ? credentialDisplayId(kind, selected.credentialId) : ''}
            />
          </ListItem>
          <ListItem onClick={() => setEdit(true)} sx={{ color: 'primary.main' }}>
            <ListItemText sx={{ textAlign: 'center' }} primary={t('peripheral.rename')} />
          </ListItem>
          <ListItem onClick={remove} sx={{ color: 'error.main', pointerEvents: busy ? 'none' : 'auto' }}>
            <ListItemText sx={{ textAlign: 'center' }} primary={t('peripheral.delete')} />
          </ListItem>
          <ListItem onClick={() => !busy && setSelected(null)}>
            <ListItemText sx={{ textAlign: 'center' }} primary={t('deviceMember.opt.cancel')} />
          </ListItem>
        </List>
      </Drawer>
      <Dialog open={edit} onClose={() => !busy && setEdit(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('peripheral.rename')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={name}
            inputProps={{ maxLength: 256 }}
            onChange={(e) => setName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setEdit(false)}>
            {t('deviceMember.opt.cancel')}
          </Button>
          <Button disabled={busy} onClick={rename}>
            {t('deviceMember.opt.ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
