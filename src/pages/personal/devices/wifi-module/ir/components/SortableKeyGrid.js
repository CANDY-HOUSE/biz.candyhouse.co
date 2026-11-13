import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';

const COLS = 3;
const DEFAULT_CELL_HEIGHT = 125;
// 长按后手指移动不超过这个距离就松开，算「长按」（弹编辑菜单），否则算拖拽排序
const LONG_PRESS_MOVE_TOLERANCE = 10;
// 触屏长按后浏览器还会补发 contextmenu，这段时间内忽略（右键菜单只给鼠标用）
const TOUCH_CONTEXTMENU_IGNORE_MS = 1500;

const cellBorderSx = (index, count) => ({
  borderRight: index % COLS < COLS - 1 ? '1px solid' : 'none',
  borderBottom: index + COLS < count ? '1px solid' : 'none',
  borderColor: 'divider',
});

const SortableCell = ({ id, index, count, cellHeight, suppressClickRef, onContextMenu, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // 拖动结束时指针常常落在按键上，浏览器会补发一次 click，这里吞掉，避免拖完误发码
      onContextMenu={onContextMenu}
      onClickCapture={(e) => {
        if (suppressClickRef.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      sx={{
        height: cellHeight,
        minWidth: 0,
        overflow: isDragging ? 'visible' : 'hidden',
        transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
        transition,
        zIndex: isDragging ? 2 : 'auto',
        position: 'relative',
        backgroundColor: isDragging ? 'background.paper' : 'transparent',
        boxShadow: isDragging ? 6 : 'none',
        opacity: isDragging ? 0.9 : 1,
        ...cellBorderSx(index, count),
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        outline: 'none',
      }}
    >
      {children}
    </Box>
  );
};

/**
 * 可拖曳排序的 3 列按键网格（非空调页、空调页、自学习页共用）。
 * 按住约 0.4 秒后：不移动直接松开 = 长按（onLongPress，弹编辑菜单）；按住移动 = 拖拽排序。
 * 鼠标同样按住触发，另外右键也能打开编辑菜单。点按键发码、上下滑动页面都不受影响。
 *
 * @param {{id: string}[]} items 已按当前顺序排好的按键
 * @param {function} renderItem (item) => 单元格内容，撑满整个格子
 * @param {function} onReorder (newIds: string[]) => void
 * @param {function} onLongPress (item) => void  可选
 * @param {React.ReactNode} trailing 可选，固定在最后、不参与排序的一格（「学习新按键」）
 * @param {number} cellHeight 每个格子的高度，默认 125
 */
const SortableKeyGrid = ({ items, renderItem, onReorder, onLongPress, trailing, cellHeight = DEFAULT_CELL_HEIGHT }) => {
  const suppressClickRef = useRef(false);
  const lastTouchRef = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 400, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } })
  );
  const ids = items.map((item) => item.id);
  const count = items.length + (trailing ? 1 : 0);

  const handleDragStart = () => {
    navigator.vibrate?.(15);
  };

  const handleDragEnd = ({ active, over, delta }) => {
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 200);
    if (Math.hypot(delta?.x ?? 0, delta?.y ?? 0) <= LONG_PRESS_MOVE_TOLERANCE) {
      const item = items.find((it) => it.id === active.id);
      if (item) onLongPress?.(item);
      return;
    }
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  const handleContextMenu = (item) => (e) => {
    e.preventDefault();
    if (Date.now() - lastTouchRef.current < TOUCH_CONTEXTMENU_IGNORE_MS) return;
    onLongPress?.(item);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <Box
          onTouchStartCapture={() => {
            lastTouchRef.current = Date.now();
          }}
          sx={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, width: '100%' }}
        >
          {items.map((item, index) => (
            <SortableCell
              key={item.id}
              id={item.id}
              index={index}
              count={count}
              cellHeight={cellHeight}
              suppressClickRef={suppressClickRef}
              onContextMenu={handleContextMenu(item)}
            >
              {renderItem(item)}
            </SortableCell>
          ))}
          {trailing && (
            <Box sx={{ height: cellHeight, minWidth: 0, position: 'relative', ...cellBorderSx(items.length, count) }}>
              {trailing}
            </Box>
          )}
        </Box>
      </SortableContext>
    </DndContext>
  );
};

export default SortableKeyGrid;
