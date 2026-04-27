import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Box, ToggleButtonGroup, ToggleButton, IconButton, Popper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { useTranslation } from 'react-i18next';

const MobileBatteryTrendChart = ({
  chartData = [],
  lightLoadDataKey = 'light',
  heavyLoadDataKey = 'heavy',
  lightPercentageKey = 'lightPercentage',
  heavyPercentageKey = 'heavyPercentage',
  lightLoadString = 'pages.sesameAccessControlDevice.index.LightV',
  heavyLoadString = 'pages.sesameAccessControlDevice.index.HeavyV',
  xAxisDataKey = 'time',
  height = 400,
  onLoadMore,
  onDeleteItemPress, // 回调函数
  showDeleteButton = false, // 是否显示删除按钮
  isMenuOpen = false,
  enablePressDeleteTrigger = false,
}) => {
  const { t } = useTranslation();
  const [brushStartIndex, setBrushStartIndex] = useState(0);
  const [brushEndIndex, setBrushEndIndex] = useState(0);
  const containerRef = useRef(null);
  const chartAreaRef = useRef(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const activePayloadRef = useRef(null); // 存储当前激活的数据点
  const virtualAnchorRef = useRef({
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
  });
  const tooltipStateRef = useRef({ active: false, payload: null, coordinate: null });
  const [yAxisUnit, setYAxisUnit] = useState('%');
  const [popperOpen, setPopperOpen] = useState(false);
  const [popperData, setPopperData] = useState(null);
  const [popperPosition, setPopperPosition] = useState(null);
  const [isTooltipLocked, setIsTooltipLocked] = useState(false);
  const [popperPlacement, setPopperPlacement] = useState('top-start');
  const lineDataKeyMap = {
    V: {
      light: lightLoadDataKey,
      heavy: heavyLoadDataKey,
      yRange: [0, 'auto'],
    },
    '%': {
      light: lightPercentageKey,
      heavy: heavyPercentageKey,
      yRange: [0, 100],
    },
  };

  const dataSource = useMemo(() => {
    return {
      main: chartData,
      high: lineDataKeyMap[yAxisUnit].light,
      low: lineDataKeyMap[yAxisUnit].heavy,
      yRange: lineDataKeyMap[yAxisUnit].yRange,
    };
  }, [chartData, yAxisUnit]);

  useEffect(() => {
    setBrushStartIndex(0);
    setBrushEndIndex(chartData.length - 1);
  }, [chartData]);

  // 拖拽加载更多逻辑（支持鼠标和触摸）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleStart = (clientX, e) => {
      isDraggingRef.current = true;
      startXRef.current = clientX;

      const isMouseEvent = e?.type === 'mousedown';
      const isInsideChartArea = isEventInsideChartArea(e);

      if (
        enablePressDeleteTrigger &&
        isMouseEvent &&
        isInsideChartArea &&
        onDeleteItemPress &&
        activePayloadRef.current
      ) {
        isDraggingRef.current = false;
        setIsTooltipLocked(true);
        onDeleteItemPress(activePayloadRef.current);
        return;
      }
    };

    const handleMove = (clientX) => {
      if (!isDraggingRef.current) return;
      const deltaX = clientX - startXRef.current;
      // 向右拖拽超过阈值（50px）触发加载更多
      if (deltaX > 50 && brushStartIndex === 0) {
        isDraggingRef.current = false;
        if (onLoadMore) {
          onLoadMore();
        }
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
    };

    // 鼠标事件
    const handleMouseDown = (e) => handleStart(e.clientX, e);
    const handleMouseMove = (e) => handleMove(e.clientX);
    const handleMouseUp = () => handleEnd();

    // 触摸事件
    const handleTouchStart = (e) => handleStart(e.touches[0].clientX, e);
    const handleTouchMove = (e) => handleMove(e.touches[0].clientX);
    const handleTouchEnd = () => handleEnd();

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [brushStartIndex, onLoadMore, onDeleteItemPress]);

  const formatXAxis = (value) => {
    if (value && typeof value === 'string') {
      return value.split(' ')[0];
    }
    return value;
  };

  const isEventInsideChartArea = (e) => {
    const chartArea = chartAreaRef.current;
    if (!chartArea || !e?.target) return false;
    return chartArea.contains(e.target);
  };

  const closePopper = () => {
    setPopperOpen(false);
    setPopperData(null);
    setPopperPosition(null);
  };

  const updateVirtualAnchor = (coordinate) => {
    const container = containerRef.current;
    if (!container || !coordinate) return;
    const rect = container.getBoundingClientRect();
    const left = rect.left + coordinate.x;
    const top = rect.top + coordinate.y;
    virtualAnchorRef.current = {
      getBoundingClientRect: () => new DOMRect(left, top, 0, 0),
    };
  };

  const getPopperPlacement = (coordinate) => {
    const container = containerRef.current;
    if (!container || !coordinate) return 'top-start';
    const containerWidth = container.clientWidth || 0;
    return coordinate.x > containerWidth * 0.65 ? 'top-end' : 'top-start';
  };

  const TooltipContent = ({ payloadData, payloadList }) => {
    return (
      <Box
        sx={{
          bgcolor: 'white',
          p: 0.5,
          border: '1px solid #ccc',
          borderRadius: 1,
          fontSize: 12,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <p style={{ margin: 0, marginBottom: 0 }}>{payloadData?.[xAxisDataKey]}</p>
          {(payloadList || []).map((entry, index) => (
            <p key={index} style={{ margin: 0, marginBottom: 0, color: entry.color }}>
              {`${entry.name}: ${isNaN(entry.value) ? '' : entry.value + yAxisUnit}`}
            </p>
          ))}
        </Box>
        {showDeleteButton && (
          <IconButton
            data-delete-button="true"
            sx={{
              p: 1,
              width: 32,
              height: 32,
              color: 'error.main',
              pointerEvents: 'auto',
              '&:active': { opacity: 0.6 },
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onDeleteItemPress && activePayloadRef.current) {
                setIsTooltipLocked(true);
                onDeleteItemPress(activePayloadRef.current);
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onDeleteItemPress && activePayloadRef.current) {
                setIsTooltipLocked(true);
                onDeleteItemPress(activePayloadRef.current);
              }
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    );
  };

  const CustomTooltip = ({ active, payload, coordinate }) => {
    if (active && payload && payload.length) {
      const nextPayload = {
        payload: payload[0].payload,
        dataKeys: {
          light: dataSource.high,
          heavy: dataSource.low,
        },
        payloadList: payload,
        coordinate,
      };
      activePayloadRef.current = nextPayload;
      tooltipStateRef.current = {
        active: true,
        payload: nextPayload,
        coordinate,
      };
    } else {
      activePayloadRef.current = null;
      tooltipStateRef.current = {
        active: false,
        payload: null,
        coordinate: null,
      };
    }
    return null;
  };

  const handleUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setYAxisUnit(newUnit);
    }
  };

  const CustomLegend = (props) => {
    const { payload } = props;
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pt: 1,
          py: 0,
        }}
      >
        <ToggleButtonGroup
          value={yAxisUnit}
          exclusive
          onChange={handleUnitChange}
          sx={{ border: 'none' }}
          aria-label="y-axis unit"
        >
          <ToggleButton value="V" aria-label="voltage" sx={{ px: 1, py: 0.5, fontSize: 10 }}>
            {t('pages.sesameAccessControlDevice.index.VoltageValue')}
          </ToggleButton>
          <ToggleButton value="%" aria-label="percentage" sx={{ px: 1, py: 0.5, fontSize: 10 }}>
            {t('pages.sesameAccessControlDevice.index.Percentage')}
          </ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {payload.map((entry, index) => (
            <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 2,
                  bgcolor: entry.color,
                }}
              />
              <span style={{ fontSize: 12, color: '#666' }}>{entry.value}</span>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const handleBrushChange = (e) => {
    if (e && e.startIndex !== undefined && e.endIndex !== undefined) {
      setBrushStartIndex(e.startIndex);
      setBrushEndIndex(e.endIndex);
    }
  };

  useEffect(() => {
    if (!isMenuOpen) {
      setIsTooltipLocked(false);
      setPopperOpen(false);
      setPopperData(null);
      setPopperPosition(null);
      setPopperPlacement('top-start');
      activePayloadRef.current = null;
      tooltipStateRef.current = { active: false, payload: null, coordinate: null };
    }
  }, [isMenuOpen]);

  useEffect(() => {
    let frameId = null;

    const syncPopper = () => {
      const { active, payload, coordinate } = tooltipStateRef.current;

      if (active && payload && coordinate) {
        if (!isTooltipLocked) {
          updateVirtualAnchor(coordinate);
          setPopperPlacement((prev) => {
            const nextPlacement = getPopperPlacement(coordinate);
            return prev === nextPlacement ? prev : nextPlacement;
          });
          setPopperData((prev) => {
            const prevTimestamp = prev?.payload?.timestamp;
            const nextTimestamp = payload?.payload?.timestamp;
            const samePosition = popperPosition?.x === coordinate.x && popperPosition?.y === coordinate.y;
            if (prevTimestamp === nextTimestamp && samePosition) {
              return prev;
            }
            return {
              payload: payload.payload,
              payloadList: payload.payloadList,
            };
          });
          setPopperPosition((prev) => {
            if (prev?.x === coordinate.x && prev?.y === coordinate.y) {
              return prev;
            }
            return coordinate;
          });
          setPopperOpen(true);
        }
      } else {
        if (!isTooltipLocked) {
          closePopper();
        }
      }

      frameId = requestAnimationFrame(syncPopper);
    };

    frameId = requestAnimationFrame(syncPopper);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isTooltipLocked, popperPosition]);

  useEffect(() => {
    if (!isTooltipLocked && popperOpen && popperPosition) {
      updateVirtualAnchor(popperPosition);
    }
  }, [popperOpen, popperPosition]);

  useEffect(() => {
    const handleWindowChange = () => {
      if (popperOpen && popperPosition) {
        updateVirtualAnchor(popperPosition);
      }
    };
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [popperOpen, popperPosition]);

  return (
    <>
      <style>
        {`
        .recharts-surface {
          user-select: none;
          outline: none;
        }
        .recharts-surface g[tabindex] {
          user-select: none;
          outline: none;
        }
        .recharts-layer.recharts-brush rect {
          stroke-width: 0.3;
        }
        .recharts-layer.recharts-brush .recharts-brush-traveller {
          stroke-width: 1;
          user-select: none;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .recharts-layer .recharts-brush-texts text {
          font-size: 10px;
          fill: #666;
        }
        .recharts-layer .recharts-brush-texts text:first-child {
          transform: translate(50px, -24px);
        }
        .recharts-layer .recharts-brush-texts text:last-child {
          transform: translate(-50px, -24px);
        }
        .recharts-wrapper {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-touch-callout: none;
        }
        `}
      </style>
      <Card sx={{ p: 0 }}>
        <div ref={containerRef} style={{ touchAction: 'pan-y' }}>
          <Box ref={chartAreaRef}>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={dataSource.main}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey={xAxisDataKey}
                  tickFormatter={formatXAxis}
                  height={48}
                  minTickGap={100}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 12 }}
                  padding={{ left: 0, right: 0 }}
                  axisLine={{ stroke: '#999' }}
                />
                <YAxis
                  unit={yAxisUnit}
                  tick={{ fontSize: 12 }}
                  domain={dataSource.yRange}
                  width={40}
                  axisLine={{ stroke: '#999' }}
                />
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ display: 'none' }} />
                <Legend verticalAlign="top" height={45} content={<CustomLegend />} />
                <Line
                  dataKey={dataSource.high}
                  stroke="#1d7f7f"
                  name={t(lightLoadString)}
                  dot={{ fill: '#1d7f7f', r: 1.2, strokeWidth: 1 }}
                  strokeWidth={1}
                  connectNulls={true}
                  animationDuration={1000}
                />
                <Line
                  dataKey={dataSource.low}
                  stroke="#97eded"
                  name={t(heavyLoadString)}
                  dot={{ fill: '#97eded', r: 1.2, strokeWidth: 1 }}
                  strokeWidth={1}
                  connectNulls={true}
                  animationDuration={1000}
                />
                <Brush
                  dataKey={xAxisDataKey}
                  height={30}
                  stroke="lightgray"
                  travellerWidth={20}
                  startIndex={brushStartIndex}
                  endIndex={brushEndIndex}
                  onChange={handleBrushChange}
                  tickFormatter={formatXAxis}
                  y={height - 45}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Popper
            open={popperOpen && !!popperData}
            anchorEl={virtualAnchorRef.current}
            placement={popperPlacement}
            modifiers={[
              {
                name: 'offset',
                options: { offset: popperPlacement === 'top-end' ? [-12, -10] : [12, -10] },
              },
              {
                name: 'preventOverflow',
                options: { padding: 8 },
              },
            ]}
            sx={{ zIndex: 1300, pointerEvents: 'auto' }}
          >
            <TooltipContent payloadData={popperData?.payload} payloadList={popperData?.payloadList || []} />
          </Popper>
        </div>
      </Card>
    </>
  );
};

export default MobileBatteryTrendChart;
