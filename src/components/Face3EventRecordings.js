import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
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
import Face3RecordingPlayer from '@/components/Face3RecordingPlayer';

export default function Face3EventRecordings({ device, onClose }) {
  const { t, i18n } = useTranslation();
  const { gFace3 } = useContext(GlobalStateContext);
  const { listFace3Recordings, playFace3Recording } = gFace3;
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState(null);
  const [media, setMedia] = useState(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState('');
  const listGeneration = useRef(0);
  const playGeneration = useRef(0);
  const listBusy = useRef(false);
  const listAbort = useRef(null);
  const playAbort = useRef(null);
  const failedBefore = useRef(null);
  const deviceId = device.deviceUUID;

  const errorKey = (message, playing = false) => {
    if (message === 'not_bound') return 'face3.errNotBound';
    if (message === 'not_authenticated') return 'face3.recordings.loginRequired';
    if (message === 'timeout' || message === 'network_error') return 'face3.errTimeout';
    if (message === 'not_found') return 'face3.recordings.notFound';
    return playing ? 'face3.recordings.playError' : 'face3.recordings.listError';
  };

  const load = useCallback(
    async (before = null) => {
      if (listBusy.current) return;
      listBusy.current = true;
      const generation = ++listGeneration.current;
      failedBefore.current = before;
      setLoading(true);
      setListError('');
      listAbort.current = new AbortController();
      const response = await listFace3Recordings(deviceId, { before, limit: 30, signal: listAbort.current.signal });
      if (generation !== listGeneration.current) return;
      listBusy.current = false;
      setLoading(false);
      if (!response.success) {
        setListError(errorKey(response.message));
        return;
      }
      setItems((old) => {
        const rows = before ? [...old, ...(response.data?.items || [])] : response.data?.items || [];
        return [...new Map(rows.map((row) => [row.recId, row])).values()];
      });
      setNext(response.data?.next || null);
    },
    [deviceId, listFace3Recordings]
  );

  useEffect(() => {
    load();
    return () => {
      listGeneration.current++;
      playGeneration.current++;
      listBusy.current = false;
      listAbort.current?.abort();
      playAbort.current?.abort();
    };
  }, [load]);

  const play = async (item) => {
    const generation = ++playGeneration.current;
    setSelected(item);
    setMedia(null);
    setPlayError('');
    setPlayLoading(true);
    playAbort.current?.abort();
    playAbort.current = new AbortController();
    const response = await playFace3Recording(deviceId, item.recId, playAbort.current.signal);
    if (generation !== playGeneration.current) return;
    setPlayLoading(false);
    if (!response.success || !response.data?.mp4 || response.data.recId !== item.recId) {
      setPlayError(errorKey(response.message, true));
      return;
    }
    setMedia(response.data);
  };
  const timestamp = (item) => new Date(Number(item.startTs) * 1000).toLocaleString(i18n.language);
  const reason = (item) =>
    t(`face3.recordings.reason.${item.reason}`, { defaultValue: t('face3.recordings.reason.event') });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('face3.recordings.title')}
        <IconButton aria-label={t('face3.cancel')} onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {device.deviceName || deviceId}
        </Typography>
        {selected && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {timestamp(selected)} · {reason(selected)}
            </Typography>
            {playLoading && <CircularProgress size={24} aria-label={t('face3.recordings.loading')} />}
            {playError && (
              <Alert severity="error" action={<Button onClick={() => play(selected)}>{t('face3.retry')}</Button>}>
                {t(playError)}
              </Alert>
            )}
            {media && <Face3RecordingPlayer key={selected.recId} media={media} onRetry={() => play(selected)} />}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {t('face3.recordings.retention')}
          </Typography>
          <Button disabled={loading} onClick={() => load()}>
            {t('face3.recordings.refresh')}
          </Button>
        </Box>
        {listError && (
          <Alert
            severity="error"
            action={<Button onClick={() => load(failedBefore.current)}>{t('face3.retry')}</Button>}
          >
            {t(listError)}
          </Alert>
        )}
        {!loading && !listError && items.length === 0 && !next && (
          <Typography sx={{ py: 3, textAlign: 'center' }} color="text.secondary">
            {t('face3.recordings.empty')}
          </Typography>
        )}
        <List>
          {items.map((item) => (
            <ListItemButton key={item.recId} selected={selected?.recId === item.recId} onClick={() => play(item)}>
              <ListItemText
                primary={timestamp(item)}
                secondary={
                  `${reason(item)} · ${t('face3.recordings.duration', { seconds: Math.round(Number(item.durationMs) / 1000) })}` +
                  (item.hasAudio ? '' : ` · ${t('face3.recordings.noAudio')}`)
                }
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          {loading ? (
            <CircularProgress size={24} aria-label={t('face3.recordings.loading')} />
          ) : (
            next && <Button onClick={() => load(next)}>{t('face3.recordings.more')}</Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
