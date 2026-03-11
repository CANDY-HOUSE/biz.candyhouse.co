import React from 'react';

/**
 * 高斯模糊遮罩组件
 * @param {boolean} enabled - 是否启用模糊效果
 * @param {number} blurAmount - 模糊程度（px），默认 10px
 * @param {number} opacity - 透明度，默认 0.6
 * @param {React.ReactNode} children - 子组件
 */
export default function BlurOverlay({ enabled = false, blurAmount = 10, opacity = 0.6, children }) {
  return (
    <div
      style={{
        filter: enabled ? `blur(${blurAmount}px)` : 'none',
        opacity: enabled ? opacity : 1,
        pointerEvents: enabled ? 'none' : 'auto',
        userSelect: enabled ? 'none' : 'auto',
        overflow: 'hidden !important',
        touchAction: enabled ? 'none' : 'auto',
        // transition: 'filter 0.3s ease, opacity 0.3s ease',
      }}
    >
      {children}
    </div>
  );
}
