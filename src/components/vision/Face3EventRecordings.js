import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, ButtonBase, CircularProgress, Typography } from '@mui/material';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import { useTranslation } from 'react-i18next';
import { GlobalStateContext } from '@context/GlobalContextProvider';
import { ReactComponent as VisionIcon } from '@assets/svg/vision.svg';

export const recordingTime = (item) => Number(item.startTs) * 1000;

/**
 * 卡片左侧的首帧缩略图（16:9）。云端有图才给地址（thumbnail），没有为 null；
 * 没有、或地址加载失败（过期、还没生成）时显示占位：与画面框空闲时同样的深底 + 淡 Vision logo。
 */
function RecordingThumb({ src }) {
  const [failed, setFailed] = useState(false);
  return (
    <Box
      sx={{
        width: 96,
        aspectRatio: '16 / 9',
        flexShrink: 0,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#2A2A2E',
        color: 'rgba(255,255,255,0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <VisionIcon width={26} height={26} aria-hidden="true" />
      )}
    </Box>
  );
}

/** 触发原因 -> 卡片右侧圆形图标。云端 reason：presence / doorbell / credential，其余归为通用录像。 */
const REASON_ICONS = {
  presence: DirectionsWalkRoundedIcon,
  sensor: DirectionsWalkRoundedIcon,
  doorbell: NotificationsActiveRoundedIcon,
  bell: NotificationsActiveRoundedIcon,
  credential: KeyRoundedIcon,
  nfc: KeyRoundedIcon,
  finger: KeyRoundedIcon,
  ai: KeyRoundedIcon,
};

/** 本地日期作分组键（YYYY-M-D） */
const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** 云端错误码 -> 文案键。列表和播放（详情页）共用。 */
export const recordingErrorKey = (message, playing = false) => {
  if (message === 'not_bound') return 'face3.errNotBound';
  if (message === 'not_authenticated') return 'face3.recordings.loginRequired';
  if (message === 'timeout' || message === 'network_error') return 'face3.errTimeout';
  if (message === 'not_found') return 'face3.recordings.notFound';
  return playing ? 'face3.recordings.playError' : 'face3.recordings.listError';
};

/**
 * 详情页的「事件录像」：标题行（右侧放父组件给的 headerAction，如「观看实时画面」）
 * + 按日期分组的录像卡片（今天 / 昨天 / 日期，从新到旧，翻页加载）。
 *
 * 卡片：最左是首帧缩略图（没有图显示占位），中间触发原因（门铃 / 有人经过 / 凭证开锁）+ 时间 · 时长，
 * 右边原因图标；正在播的那张主题色描边。
 *
 * 播放不在这里：点一张只回调 onSelect，详情页在画面框里播放，并把正在播的 recId 传回 selectedRecId。
 * removedRecIds：详情页刚删掉的录像，直接从列表里隐去，不重新拉列表。
 */
export default function Face3EventRecordings({ device, selectedRecId, onSelect, headerAction, removedRecIds }) {
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

  const clock = (item) =>
    new Date(recordingTime(item)).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const meta = (item) =>
    [
      clock(item),
      t('face3.recordings.duration', { seconds: Math.round(Number(item.durationMs) / 1000) }),
      ...(item.hasAudio ? [] : [t('face3.recordings.noAudio')]),
    ].join(' · ');
  const reasonLabel = (item) =>
    t(`face3.recordings.reason.${item.reason}`, { defaultValue: t('face3.recordings.reason.event') });
  const dayLabel = (ms) => {
    const key = dayKey(ms);
    if (key === dayKey(Date.now())) return t('face3.recordings.today');
    if (key === dayKey(Date.now() - 86400_000)) return t('face3.recordings.yesterday');
    return new Date(ms).toLocaleDateString(i18n.language, { month: 'numeric', day: 'numeric', weekday: 'short' });
  };
  /* 列表本来就是从新到旧，按相邻同日分组即可 */
  const groups = [];
  items.forEach((item) => {
    if (removedRecIds?.has(item.recId)) return;
    const key = dayKey(recordingTime(item));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(recordingTime(item)), items: [item] });
  });
  const titleId = `face3-recordings-${deviceId}`;

  return (
    /* 父级给了高度时（详情页）：标题行固定，下面的卡片在自己里面滚动；没给高度时照常往下排 */
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, minHeight: 56, px: 2, py: 1 }}>
        <Typography id={titleId} component="h2" sx={{ flex: 1, fontSize: 18, fontWeight: 700, color: 'common.black' }}>
          {t('face3.recordings.title')}
        </Typography>
        {headerAction}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 1 }}>
        {listError && (
          <Alert
            severity="error"
            sx={{ mb: 1 }}
            action={<Button onClick={() => load(failedBefore.current)}>{t('face3.retry')}</Button>}
          >
            {t(listError)}
          </Alert>
        )}

        {groups.map((group) => (
          <Box key={group.key} component="section" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
              {group.label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map((item) => {
                const selected = item.recId === selectedRecId;
                const ReasonIcon = REASON_ICONS[item.reason] || VideocamRoundedIcon;
                return (
                  <ButtonBase
                    key={item.recId}
                    aria-current={selected || undefined}
                    onClick={() => onSelect(item)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      width: '100%',
                      pl: 1,
                      pr: 2,
                      py: 1,
                      textAlign: 'left',
                      borderRadius: 3,
                      bgcolor: 'grey.100',
                      border: 2,
                      /* 正在播的这张主题色描边，其余描边透明以免选中时跳动 */
                      borderColor: selected ? 'primary.main' : 'transparent',
                    }}
                  >
                    {/* 换了地址（重新拉列表）就重新加载，之前的失败不沿用 */}
                    <RecordingThumb key={item.thumbnail || 'none'} src={item.thumbnail} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'common.black' }}>
                        {reasonLabel(item)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', mt: 0.25 }}
                      >
                        {meta(item)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'common.white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ReasonIcon sx={{ fontSize: 20 }} />
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
        ))}

        {!loading && !listError && groups.length === 0 && !next && (
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
