import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
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
}) => {
  const { t } = useTranslation();
  const [brushStartIndex, setBrushStartIndex] = useState(0);
  const [brushEndIndex, setBrushEndIndex] = useState(0);
  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [yAxisUnit, setYAxisUnit] = useState('%');
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

    const handleStart = (clientX) => {
      isDraggingRef.current = true;
      startXRef.current = clientX;
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
    const handleMouseDown = (e) => handleStart(e.clientX);
    const handleMouseMove = (e) => handleMove(e.clientX);
    const handleMouseUp = () => handleEnd();

    // 触摸事件
    const handleTouchStart = (e) => handleStart(e.touches[0].clientX);
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
  }, [brushStartIndex, onLoadMore]);

  const formatXAxis = (value) => {
    if (value && typeof value === 'string') {
      return value.split(' ')[0];
    }
    return value;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'white',
            p: 0.5,
            border: '1px solid #ccc',
            borderRadius: 1,
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0, marginBottom: 0 }}>{payload[0].payload[xAxisDataKey]}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, marginBottom: 0, color: entry.color }}>
              {`${entry.name}: ${isNaN(entry.value) ? '' : entry.value + yAxisUnit}`}
            </p>
          ))}
        </Box>
      );
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
        `}
      </style>
      <Card sx={{ p: 0 }}>
        <div ref={containerRef} style={{ touchAction: 'pan-y' }}>
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
              <Tooltip content={<CustomTooltip />} />
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
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
};

export default MobileBatteryTrendChart;
