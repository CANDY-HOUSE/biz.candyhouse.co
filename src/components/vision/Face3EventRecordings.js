import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, List, ListItemButton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';

export const recordingTime = (item) => Number(item.startTs) * 1000;

/** 云端错误码 -> 文案键。列表和播放（详情页）共用。 */
export const recordingErrorKey = (message, playing = false) => {
  if (message === 'not_bound') return 'face3.errNotBound';
  if (message === 'not_authenticated') return 'face3.recordings.loginRequired';
  if (message === 'timeout' || message === 'network_error') return 'face3.errTimeout';
  if (message === 'not_found') return 'face3.recordings.notFound';
  return playing ? 'face3.recordings.playError' : 'face3.recordings.listError';
};

/**
 * 详情页的「事件录像」：分组标题 + 录像列表（从新到旧，翻页加载）。
 *
 * 播放不在这里：点一行只回调 onSelect，详情页在画面框里播放，并把正在播的
 * recId 传回 selectedRecId，这一行时间加粗、行尾写「播放中」（背景不变色）。
 *
 * 触发原因（reason）固件目前区分不了，先不显示；云端也还没有缩略图，行里只放时间和时长。
 */
export default function Face3EventRecordings({ device, selectedRecId, onSelect }) {
  const { t, i18n } = useTranslation();
  const { gFace3 } = useContext(GlobalStateContext);
  const { listFace3Recordings } = gFace3;
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const listGeneration = useRef(0);
  const listBusy = useRef(false);
  const listAbort = useRef(null);
  const failedBefore = useRef(null);
  const deviceId = device.deviceUUID;

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
        setListError(recordingErrorKey(response.message));
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
      listBusy.current = false;
      listAbort.current?.abort();
    };
  }, [load]);

  const timestamp = (item) => new Date(recordingTime(item)).toLocaleString(i18n.language);
  const meta = (item) =>
    t('face3.recordings.duration', { seconds: Math.round(Number(item.durationMs) / 1000) }) +
    (item.hasAudio ? '' : ` · ${t('face3.recordings.noAudio')}`);
  const titleId = `face3-recordings-${deviceId}`;

  return (
    /* 父级给了高度时（详情页）：标题栏固定，下面的列表在自己里面滚动；没给高度时照常往下排 */
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* 分组标题在白色卡片外面：灰底一栏，文字垂直居中 */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, minHeight: 30, px: 2, bgcolor: 'secondary.main' }}
      >
        <Typography id={titleId} component="h2" sx={{ fontSize: 13, fontWeight: 500, color: 'title.light' }}>
          {t('face3.recordings.title')}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', bgcolor: 'background.paper' }}>
        {listError && (
          <Alert
            severity="error"
            sx={{ m: 2 }}
            action={<Button onClick={() => load(failedBefore.current)}>{t('face3.retry')}</Button>}
          >
            {t(listError)}
          </Alert>
        )}

        <List disablePadding>
          {items.map((item) => {
            const selected = item.recId === selectedRecId;
            return (
              <ListItemButton
                key={item.recId}
                selected={selected}
                aria-current={selected || undefined}
                onClick={() => onSelect(item)}
                /* 选中只靠加粗和行尾"播放中"表达，背景不变色 */
                sx={{ gap: 1.5, px: 2, py: 1, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'transparent' } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: selected ? 700 : 400,
                      color: 'common.black',
                    }}
                  >
                    {timestamp(item)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {meta(item)}
                  </Typography>
                </Box>
                {selected && (
                  <Typography variant="caption" sx={{ flexShrink: 0, color: 'common.black', fontWeight: 500 }}>
                    {t('face3.recordings.playing')}
                  </Typography>
                )}
              </ListItemButton>
            );
          })}
        </List>

        {!loading && !listError && items.length === 0 && !next && (
          <Typography sx={{ py: 3, textAlign: 'center' }} color="text.secondary">
            {t('face3.recordings.empty')}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          {loading ? (
            <CircularProgress size={24} aria-label={t('face3.recordings.loading')} />
          ) : (
            next && <Button onClick={() => load(next)}>{t('face3.recordings.more')}</Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
