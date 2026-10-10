import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

const rowHeight = 30;
// Cyclic wheel matching the Android picker. Only deliberate input commits a value.
export default function LockSettingWheel({ values, value, label, onChange, disabled, title, visibleRows = 5 }) {
  const padding = ((visibleRows - 1) / 2) * rowHeight;
  const list = useRef(null);
  const timer = useRef(null);
  const touched = useRef(false);
  const dragging = useRef(false);
  const select = useRef(onChange);
  select.current = onChange;
  const initial = Math.max(0, values.indexOf(value));
  const [index, setIndex] = useState(values.length + initial);
  useEffect(() => {
    list.current.scrollTop = (values.length + initial) * rowHeight;
    return () => clearTimeout(timer.current);
  }, []);
  const settle = () => {
    if (!touched.current || dragging.current || disabled) return;
    touched.current = false;
    const position = Math.round(list.current.scrollTop / rowHeight);
    select.current(values[position % values.length]);
  };
  return (
    <Box sx={{ position: 'relative', bgcolor: '#ededed', height: visibleRows * rowHeight }}>
      <Box
        sx={{
          position: 'absolute',
          top: padding,
          height: 30,
          left: 0,
          right: 0,
          borderBlock: '1px solid #d5d5d5',
          pointerEvents: 'none',
        }}
      />
      <Box
        ref={list}
        role="listbox"
        aria-label={title}
        aria-disabled={disabled}
        onPointerDown={() => {
          dragging.current = true;
          touched.current = true;
          clearTimeout(timer.current);
        }}
        onPointerUp={() => {
          dragging.current = false;
          timer.current = setTimeout(settle, 180);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onWheel={() => {
          touched.current = true;
        }}
        onScroll={() => {
          setIndex(Math.round(list.current.scrollTop / rowHeight));
          clearTimeout(timer.current);
          timer.current = setTimeout(settle, 180);
        }}
        sx={{
          height: '100%',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          py: `${padding}px`,
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {Array.from({ length: values.length * 3 }, (_, i) => {
          const v = values[i % values.length];
          const distance = Math.min(
            Math.abs((i % values.length) - (index % values.length)),
            values.length - Math.abs((i % values.length) - (index % values.length))
          );
          return (
            <Box
              component="button"
              type="button"
              role="option"
              aria-selected={i === index}
              disabled={disabled}
              key={i}
              onClick={() => {
                clearTimeout(timer.current);
                touched.current = false;
                select.current(v);
              }}
              sx={{
                display: 'block',
                width: '100%',
                height: rowHeight,
                p: 0,
                border: 0,
                background: 'transparent',
                font: 'inherit',
                fontSize: 17,
                lineHeight: `${rowHeight}px`,
                scrollSnapAlign: 'center',
                color: distance === 0 ? '#333' : '#aaa',
                transform: `scaleY(${distance === 0 ? 1 : distance === 1 ? 0.85 : 0.6})`,
                cursor: 'pointer',
              }}
            >
              {label(v)}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
