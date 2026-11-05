import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';

const COLS = 3;
const DEFAULT_CELL_HEIGHT = 125;

const SortableCell = ({ id, index, count, cellHeight, suppressClickRef, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const col = index % COLS;
  const hasItemBelow = index + COLS < count;

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // 拖动结束时指针常常落在按键上，浏览器会补发一次 click，这里吞掉，避免拖完误发码
      onClickCapture={(e) => {
        if (suppressClickRef.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      sx={{
        height: cellHeight,
        transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
        transition,
        zIndex: isDragging ? 2 : 'auto',
        position: 'relative',
        backgroundColor: isDragging ? 'background.paper' : 'transparent',
        boxShadow: isDragging ? 6 : 'none',
        opacity: isDragging ? 0.9 : 1,
        borderRight: col < COLS - 1 ? '1px solid' : 'none',
        borderBottom: hasItemBelow ? '1px solid' : 'none',
        borderColor: 'divider',
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
 * 可拖曳排序的 3 列按键网格（非空调页、空调页共用）。
 * 触屏长按后拖动、鼠标移动一小段后拖动，所以点按键发码、上下滑动页面都不受影响。
 *
 * @param {{id: string}[]} items 已按当前顺序排好的按键
 * @param {function} renderItem (item) => 单元格内容，撑满整个格子
 * @param {function} onReorder (newIds: string[]) => void
 * @param {number} cellHeight 每个格子的高度，默认 125
 */
const SortableKeyGrid = ({ items, renderItem, onReorder, cellHeight = DEFAULT_CELL_HEIGHT }) => {
  const suppressClickRef = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  );
  const ids = items.map((item) => item.id);

  const handleDragEnd = ({ active, over }) => {
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 200);
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, width: '100%' }}>
          {items.map((item, index) => (
            <SortableCell
              key={item.id}
              id={item.id}
              index={index}
              count={items.length}
              cellHeight={cellHeight}
              suppressClickRef={suppressClickRef}
            >
              {renderItem(item)}
            </SortableCell>
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
};

export default SortableKeyGrid;
