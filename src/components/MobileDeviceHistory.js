import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, CircularProgress, List, ListItem, ListItemIcon, ListItemText, SvgIcon, Typography } from '@mui/material';
import { SvgArrow } from '@/assets/svg/svgLock';
import { CmHistoryExt } from './biz/device/CmHistoryExt';
import { Buffer } from 'buffer';
import { biz3utils } from '@/utils/biz3utils';
import { ios, hairline } from '@/theme/appHomeStyle';

// Rows scroll under the sticky date; these corners keep the card's top rounded to match its bottom.
const corner = (at) => ({
  content: '""',
  position: 'absolute',
  top: '100%',
  width: ios.cardRadius,
  height: ios.cardRadius,
  pointerEvents: 'none',
  background: `radial-gradient(circle at ${at}, transparent calc(${ios.cardRadius} - 0.5px), ${ios.background} ${ios.cardRadius})`,
});
const stuckCornersSx = {
  '&::before': { ...corner('100% 100%'), left: 16 },
  '&::after': { ...corner('0 100%'), right: 16 },
};

const MobileDeviceHistory = ({
  fullHeight = true,
  histories,
  loading = false,
  onLoadMore,
  onItemLongPress,
  onItemClick,
  inset = false,
}) => {
  const [groupedHistories, setGroupedHistories] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreTriggerRef = useRef(null);
  const rowHeight = 64;
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const longPressThreshold = 500;

  // 按日期分组历史记录
  const groupHistoriesByDate = (histories) => {
    const sorted = [...histories].sort((a, b) => a.timestamp - b.timestamp);
    const grouped = {};
    sorted.forEach((item) => {
      const date = new Date(item.timestamp);
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeek = daysOfWeek[date.getDay()];
      const dateKey = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${dayOfWeek}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return Object.keys(grouped)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((date) => ({
        date,
        items: grouped[date],
      }));
  };

  const prevScrollInfo = useRef({ height: 0, top: 0 });
  useEffect(() => {
    if (histories && histories.length > 0) {
      const grouped = groupHistoriesByDate(histories);
      if (scrollRef.current && !isInitialLoad) {
        prevScrollInfo.current = {
          height: scrollRef.current.scrollHeight,
          top: scrollRef.current.scrollTop,
        };
      }
      setGroupedHistories(grouped);
    } else {
      setGroupedHistories([]);
    }
  }, [histories, isInitialLoad]);

  useLayoutEffect(() => {
    if (groupedHistories.length > 0 && scrollRef.current) {
      if (isInitialLoad) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setIsInitialLoad(false); // 使用 setState
      } else {
        const heightDiff = scrollRef.current.scrollHeight - prevScrollInfo.current.height;
        if (heightDiff > 0) {
          scrollRef.current.scrollTop = prevScrollInfo.current.top + heightDiff - rowHeight * 0.5;
        }
      }
    }
  }, [groupedHistories, isInitialLoad]);

  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || isInitialLoad) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoading && hasMore) {
          setIsLoading(true);
          if (onLoadMore) {
            onLoadMore((lastKey) => {
              setTimeout(() => {
                setHasMore(!!lastKey);
                setIsLoading(false);
              }, 100);
            });
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => {
      if (loadMoreTriggerRef.current) {
        observer.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [hasMore, isLoading, onLoadMore, isInitialLoad]); // 添加 isInitialLoad 到依赖项

  const handleTouchStart = (e, item) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (onItemLongPress) {
        onItemLongPress(item, e);
      }
    }, longPressThreshold);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (item) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onItemClick?.(item);
  };

  const getPrimaryTitle = (item) => {
    const userName = item.history_tag
      ? Buffer.from(
          typeof item.history_tag === 'object' ? Object.values(item.history_tag) : item.history_tag,
          'base64'
        ).toString('utf8')
      : CmHistoryExt.ManualContent({ type: item.type });

    // Bot2/Bot3 script history
    if (item.botHistoryMode === 'script') {
      return item.botAlias ? `${userName} ${item.botAlias}` : userName;
    }

    // Bot2/Bot3 widget click history
    if (item.botHistoryMode === 'widget') {
      return `${userName} Widget Click`;
    }

    // Bot2/Bot3 manual click history
    if (item.botHistoryMode === 'manual') {
      return 'Manual Click';
    }

    return userName;
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: fullHeight ? '100vh' : '100%',
        bgcolor: inset ? ios.background : 'background.paper',
        position: 'relative',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      <Box
        ref={scrollRef}
        sx={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'contain',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {hasMore && <Box ref={loadMoreTriggerRef} sx={{ height: 40 }} />}
        {groupedHistories.map((group, _groupIndex) => (
          <Box key={group.date} sx={{ pb: inset ? '8px' : 0 }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: inset ? ios.background : ios.card,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                px: inset ? '32px' : '16px',
                zIndex: 1000,
                ...(inset && stuckCornersSx),
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: ios.secondaryLabel }}>{group.date}</Typography>
            </Box>
            <List
              sx={{
                p: 0,
                ...(inset && { mx: '16px', bgcolor: ios.card, borderRadius: ios.cardRadius, overflow: 'hidden' }),
              }}
            >
              {group.items.map((item, index) => (
                <ListItem
                  key={`${item.record_id}-${index}`}
                  sx={{
                    height: rowHeight,
                    py: 0,
                    userSelect: 'none',
                    cursor: 'pointer',
                    '&:active': { bgcolor: ios.pressed },
                    '&:not(:last-child)::after': {
                      content: '""',
                      position: 'absolute',
                      left: 56,
                      right: 0,
                      bottom: 0,
                      height: 0,
                      borderBottom: hairline,
                    },
                  }}
                  onClick={() => handleItemClick(item)}
                  onTouchStart={(e) => handleTouchStart(e, item)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  onMouseDown={(e) => handleTouchStart(e, item)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                >
                  <ListItemIcon sx={{ minWidth: '2.5rem' }}>
                    <CmHistoryExt.StatusView type={item.type} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: { xs: 17, md: 16 }, color: ios.label }}>
                        {getPrimaryTitle(item)}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ fontSize: 13, color: ios.secondaryLabel, mt: '2px' }}>
                        {biz3utils.timestampToTime(item.timestamp, false)}
                      </Typography>
                    }
                  />
                  {item.deviceName?.length > 0 && (
                    <Typography sx={{ fontSize: 13, color: ios.secondaryLabel, pl: 2 }}>{item.deviceName}</Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CmHistoryExt.ViaView
                      type={item.type}
                      botViaType={item.botViaType}
                      botHistoryMode={item.botHistoryMode}
                    />
                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                      <SvgIcon component={SvgArrow} />
                    </ListItemIcon>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MobileDeviceHistory;
