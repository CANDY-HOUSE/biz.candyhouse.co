import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  ListItem,
  ListItemText,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import { SvgArrow } from '@/assets/svg/svgLock';
import SettingsGroup from '../SettingsGroup';
import { GlobalStateContext } from '@/context/GlobalContextProvider';

/**
 * Face3 设置页「欢迎回家」分组里的「识别成功动画」：识别成功时门铃屏幕播放的视频，从服务端的片库里选。
 *
 * 数据都从 Face3_qr 取（useFace3 的 getFace3WelcomeVid / listFace3WelcomeVids / setFace3WelcomeVid）。
 * Face3 一律显示这一组：打开设置页先查当前选择，查不到（网络或云端尚未支持）时行上显示「未获取」，
 * 仍可点开 —— 点开时再查一次，片库加载失败可点击重试；能否保存由云端按钥匙级别判定。
 * 片库分页加载，滚到底自动加载下一页。默认那个（云端回包的 defaultVid）就是固件出厂内置的那段，
 * 服务端把它排在第一个，这里加「默认」标记；没选过时当前选择就是它。
 * 保存后门铃下次开机联网时自己同步：选默认就回到内置那套，选别的就下载替换。
 */

/* 门铃屏幕：用户看到的是 600×450 横屏。预览按这个比例显示，空间够时 1:1，不放大、不裁剪 */
const SCREEN_W = 600;
const SCREEN_H = 450;
/* 横向布局（宽屏）：左边预览、右边片库；右栏宽度够放三列缩略图，高度与左栏大致齐平、超出就滚动 */
const LIST_W = 400;
const LIST_MAX_H = 520;
const COLUMN_GAP = 24;
const PAGE_SIZE = 12;

/* 服务端的名称 / 简介按 ja / en / zh-CN / zh-TW 给，按界面语言取，没有就退到英文、日文 */
const pickText = (texts, language) => {
  const lang = String(language || '');
  const key = /^zh/i.test(lang) ? (/TW|Hant|HK|MO/i.test(lang) ? 'zh-TW' : 'zh-CN') : lang.slice(0, 2).toLowerCase();
  return texts?.[key] || texts?.en || texts?.ja || Object.values(texts || {})[0] || '';
};

/** 4:3 横屏框：宽度跟随容器，最多 600px（1:1）；高度按比例 */
const screenSx = {
  width: '100%',
  maxWidth: SCREEN_W,
  aspectRatio: `${SCREEN_W} / ${SCREEN_H}`,
  mx: 'auto',
  borderRadius: 2,
  overflow: 'hidden',
  bgcolor: '#000',
  position: 'relative',
};

const centerSx = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

/**
 * @param {object} props
 * @param {string} props.deviceUUID
 */
export default function Face3UnlockClipSetting({ deviceUUID }) {
  const { t, i18n } = useTranslation();
  const { gFace3, setSnackbarValue } = useContext(GlobalStateContext);
  const { getFace3WelcomeVid, listFace3WelcomeVids, setFace3WelcomeVid } = gFace3;

  /* 当前选择：status 为 loading / ok / error；ok 时带 welcomeVid、canEdit、item（当前那项） */
  const [current, setCurrent] = useState({ status: 'loading' });
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  /* undefined：还没加载第一页；null：没有下一页了；字符串：下一页的 cursor */
  const [nextCursor, setNextCursor] = useState(undefined);
  const [listError, setListError] = useState(false);
  const [loading, setLoading] = useState(false);
  /* 默认那个（= 固件出厂内置）的 id，随查询 / 列表回包给出 */
  const [defaultVid, setDefaultVid] = useState(null);
  /* 弹窗里选中的 id；没查到当前选择时为 null */
  const [picked, setPicked] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  /* 宽屏横向（左预览、右片库，片库自己滚动）；手机等窄屏仍上下排（整个弹窗滚动） */
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const loadingRef = useRef(false);
  const listAbortRef = useRef(null);
  const getAbortRef = useRef(null);
  /* 弹窗里用户点过卡片没有：没点过时，晚到的查询结果可以改选中项 */
  const pickTouchedRef = useRef(false);

  /* 查当前选择。已查到过的不因为一次失败被冲掉 */
  const refreshCurrent = useCallback(() => {
    getAbortRef.current?.abort();
    const controller = new AbortController();
    getAbortRef.current = controller;
    getFace3WelcomeVid(deviceUUID, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      if (res?.success && res.data?.welcomeVid) {
        const { welcomeVid, canEdit, item } = res.data;
        setCurrent({ status: 'ok', welcomeVid, canEdit: !!canEdit, item: item || null });
        if (res.data.defaultVid) setDefaultVid(res.data.defaultVid);
        if (!pickTouchedRef.current) setPicked(welcomeVid);
      } else {
        setCurrent((prev) => (prev.status === 'ok' ? prev : { status: 'error' }));
      }
    });
  }, [deviceUUID, getFace3WelcomeVid]);

  useEffect(() => {
    setCurrent({ status: 'loading' });
    refreshCurrent();
    return () => getAbortRef.current?.abort();
  }, [refreshCurrent]);

  useEffect(() => () => listAbortRef.current?.abort(), []);

  const loadMore = useCallback(() => {
    if (loadingRef.current || nextCursor === null) return;
    loadingRef.current = true;
    setLoading(true);
    setListError(false);
    const controller = new AbortController();
    listAbortRef.current = controller;
    listFace3WelcomeVids(deviceUUID, { cursor: nextCursor, limit: PAGE_SIZE, signal: controller.signal }).then(
      (res) => {
        loadingRef.current = false;
        if (controller.signal.aborted) return;
        setLoading(false);
        if (!res?.success || !Array.isArray(res.data?.items)) {
          setListError(true);
          return;
        }
        /* 翻页途中有视频被撤掉时，服务端会从头再给一遍：按 id 去重 */
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.welcomeVid));
          return [...prev, ...res.data.items.filter((i) => !seen.has(i.welcomeVid))];
        });
        setNextCursor(res.data.nextCursor || null);
        if (res.data.defaultVid) setDefaultVid(res.data.defaultVid);
      }
    );
  }, [deviceUUID, listFace3WelcomeVids, nextCursor]);

  /* 打开后加载第一页 */
  useEffect(() => {
    if (open && nextCursor === undefined && !loadingRef.current) loadMore();
  }, [open, nextCursor, loadMore]);

  /* 滚到列表底部自动加载下一页（底部的「加载更多」按钮也能点） */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!open || !sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), {
      /* 横向时滚的是右栏，上下排时滚的是整个弹窗 */
      root: wide ? listRef.current : contentRef.current,
      rootMargin: '120px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, loadMore, items.length, listError, wide]);

  const itemOf = (id) =>
    items.find((i) => i.welcomeVid === id) || (current?.item?.welcomeVid === id ? current.item : null);
  const nameOf = (id) => pickText(itemOf(id)?.name, i18n.language);
  const descOf = (id) => pickText(itemOf(id)?.desc, i18n.language);

  /* 点卡片：选中并播放（声音要在点击里起播，手机上才放得出来） */
  const play = (id) => {
    pickTouchedRef.current = true;
    setPicked(id);
    const video = videoRef.current;
    const item = itemOf(id);
    if (!video || !item?.preview) {
      setPlaying(false);
      return;
    }
    if (video.src !== item.preview) {
      video.src = item.preview;
      video.poster = item.poster || '';
    }
    video.currentTime = 0;
    video.muted = false;
    video.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  };

  /* 打开、或换了选中项：把这一套放进预览区（不自动出声，点卡片才播） */
  useEffect(() => {
    const video = videoRef.current;
    const item = items.find((i) => i.welcomeVid === picked) || current?.item;
    if (!open || !video || !item?.preview || item.welcomeVid !== picked || video.src === item.preview) return;
    video.src = item.preview;
    video.poster = item.poster || '';
  }, [open, picked, items, current]);

  const close = () => {
    videoRef.current?.pause();
    listAbortRef.current?.abort();
    loadingRef.current = false;
    setLoading(false);
    setPlaying(false);
    setOpen(false);
  };

  const openDialog = () => {
    pickTouchedRef.current = false;
    setPicked(current.welcomeVid || null);
    /* 之前没查到当前选择：点开时再查一次 */
    if (current.status !== 'ok') refreshCurrent();
    /* 每次打开重新加载：预览地址 1 小时就过期 */
    setItems([]);
    setNextCursor(undefined);
    setListError(false);
    setSaveError('');
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    const res = await setFace3WelcomeVid(deviceUUID, picked);
    setSaving(false);
    if (!res?.success) {
      setSaveError(
        t(res?.message === 'no_permission' ? 'face3.unlockClip.noPermission' : 'face3.unlockClip.saveFailed')
      );
      return;
    }
    setCurrent((prev) => ({
      status: 'ok',
      /* 没查到过当前选择却保存成功了，说明有修改权限 */
      canEdit: prev.status === 'ok' ? prev.canEdit : true,
      welcomeVid: picked,
      item: itemOf(picked),
    }));
    setSnackbarValue({ open: true, msg: t('face3.unlockClip.saved') });
    close();
  };

  /* 查到了且没有权限才不让点；还没查到时先放行，保存时由云端判定 */
  const editable = current.status !== 'ok' || current.canEdit;
  const rowValue =
    current.status === 'ok'
      ? nameOf(current.welcomeVid)
      : current.status === 'error'
        ? t('face3.unlockClip.unavailable')
        : '';
  const pickedItem = picked ? itemOf(picked) : null;

  return (
    <>
      {/* 单独一个分组，标题样式同「感应与声音」 */}
      <SettingsGroup header={t('face3.unlockClip.group')}>
        <ListItem
          onClick={editable ? openDialog : undefined}
          sx={{ cursor: editable ? 'pointer' : 'default', minHeight: 53 }}
        >
          <ListItemText primary={t('face3.unlockClip.title')} sx={{ flex: 1, mr: 1 }} />
          <Typography component="div" sx={{ color: 'text.secondary', textAlign: 'right' }}>
            {rowValue}
          </Typography>
          {editable && <SvgIcon component={SvgArrow} />}
        </ListItem>
      </SettingsGroup>

      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth={false}
        /* 预览区 600px（电脑上按门铃屏幕 1:1 显示）+ 左右各 24px 内边距；横向时再加右栏片库 */
        PaperProps={{ sx: { maxWidth: wide ? SCREEN_W + COLUMN_GAP + LIST_W + 48 : SCREEN_W + 48 } }}
        aria-label={t('face3.unlockClip.title')}
      >
        <DialogContent
          ref={contentRef}
          sx={{
            pb: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { md: `${COLUMN_GAP}px` },
            alignItems: { md: 'flex-start' },
          }}
        >
          {/* 左栏：预览区（和门铃屏幕同为 600×450 横屏）、名称简介、提示 */}
          <Box sx={{ flex: { md: '1 1 auto' }, minWidth: 0, width: '100%', maxWidth: { md: SCREEN_W } }}>
            <Box sx={screenSx}>
              <Box
                component="video"
                ref={videoRef}
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onClick={() => pickedItem && play(picked)}
                sx={{
                  display: pickedItem ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  cursor: 'pointer',
                }}
              />
              {pickedItem && !playing && (
                <Box sx={{ ...centerSx, pointerEvents: 'none' }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PlayArrowIcon fontSize="large" />
                  </Box>
                </Box>
              )}
            </Box>
            <Typography sx={{ mt: 1, textAlign: 'center', fontWeight: 500 }}>{nameOf(picked)}</Typography>
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 13, minHeight: 20 }}>
              {descOf(picked)}
            </Typography>
            <Typography sx={{ mt: 1, color: saveError ? 'error.main' : 'text.secondary', fontSize: 12 }}>
              {saveError || t('face3.unlockClip.syncHint')}
            </Typography>
          </Box>

          {/* 右栏：片库（横向时自己滚动，高度与左栏大致齐平） */}
          <Box
            ref={listRef}
            sx={{
              flex: { md: `0 0 ${LIST_W}px` },
              width: { xs: '100%', md: LIST_W },
              maxHeight: { md: LIST_MAX_H },
              overflowY: { md: 'auto' },
              mt: { xs: 2, md: 0 },
              pr: { md: 0.5 },
            }}
          >
            {/* 片库卡片：缩略图同为 4:3 横屏 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              {items.map(({ welcomeVid: id, poster }) => {
                const selected = picked === id;
                return (
                  <ButtonBase
                    key={id}
                    onClick={() => play(id)}
                    aria-pressed={selected}
                    sx={{
                      display: 'block',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: 2,
                      borderColor: selected ? 'primary.main' : 'transparent',
                      textAlign: 'center',
                    }}
                  >
                    <Box sx={{ position: 'relative', aspectRatio: `${SCREEN_W} / ${SCREEN_H}`, bgcolor: 'grey.800' }}>
                      {!poster ? (
                        <Box sx={{ ...centerSx, color: 'rgba(255,255,255,0.85)' }}>
                          <PlayArrowIcon />
                        </Box>
                      ) : (
                        <Box
                          component="img"
                          src={poster}
                          alt=""
                          loading="lazy"
                          sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      )}
                      {id === defaultVid && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            px: 0.75,
                            borderRadius: 1,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            fontSize: 11,
                            lineHeight: '18px',
                          }}
                        >
                          {t('face3.unlockClip.defaultTag')}
                        </Box>
                      )}
                      {selected && (
                        <CheckCircleIcon
                          color="primary"
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'white', borderRadius: '50%' }}
                        />
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 13, py: 0.5, px: 0.5 }} noWrap>
                      {nameOf(id)}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>

            {/* 列表底部：加载中 / 失败重试 / 还有下一页 */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 40, mt: 1 }}>
              {loading && <CircularProgress size={20} />}
              {!loading && listError && (
                <Button size="small" onClick={loadMore}>
                  {t('face3.unlockClip.loadFailed')}
                </Button>
              )}
              {!loading && !listError && typeof nextCursor === 'string' && (
                <Button ref={sentinelRef} size="small" onClick={loadMore}>
                  {t('face3.unlockClip.loadMore')}
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 0 }}>
          <Button size="small" onClick={close}>
            {t('face3.unlockClip.cancel')}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={save}
            disabled={saving || !picked || picked === current.welcomeVid}
          >
            {t('face3.unlockClip.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
