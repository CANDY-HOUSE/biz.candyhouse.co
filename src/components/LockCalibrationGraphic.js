import { useRef } from 'react';
import knob from '@/assets/lock-settings/knob.png';
import locked from '@/assets/lock-settings/locked.svg';
import unlocked from '@/assets/lock-settings/unlocked.svg';

// Geometry and artwork ported from SesameView / SlidingDoorView in the Android backup.
export default function LockCalibrationGraphic({ settings, onClick, label, disabled }) {
  const travel = useRef({ min: Infinity, max: -Infinity });
  const { position = 0, lockPosition = 0, unlockPosition = 0, switchPoint, productType } = settings;
  const icon = (src, x, y) => <image href={src} x={x - 14} y={y - 14} width="28" height="28" />;
  const radial = (angle, radius = 128) => {
    const radians = (angle * Math.PI) / 180;
    return [150 + Math.cos(radians) * radius, 150 - Math.sin(radians) * radius];
  };
  const points = [position, lockPosition, unlockPosition].filter(Number.isFinite);
  travel.current.min = Math.min(travel.current.min, ...points);
  travel.current.max = Math.max(travel.current.max, ...points);
  const center = (travel.current.min + travel.current.max) / 2;
  const min = Math.min(travel.current.min, center - 10);
  const max = Math.max(travel.current.max, center + 10);
  const normalized = (v) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const slideHeight = 260;
  const slideTop = (v) => 20 + slideHeight * 0.58 * (1 - normalized(v));
  const slideCenter = (v) => slideTop(v) + (slideHeight * 0.42) / 2;
  const sliding = productType === 32;
  const [x1, y1] = radial(switchPoint || 0, 114);
  const [x2, y2] = radial(switchPoint || 0, 142);
  return (
    <svg
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      viewBox={sliding ? '0 0 310 300' : '0 0 300 300'}
      style={{
        width: sliding ? 310 : 300,
        maxWidth: '100%',
        display: 'block',
        margin: 'auto',
        cursor: disabled ? 'default' : 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {sliding ? (
        <>
          <rect x="90" y="20" width="130" height={slideHeight} rx="18" fill="#E7E6EB" />
          <rect x="96" y={slideTop(position)} width="118" height={slideHeight * 0.42} rx="20" fill="#C2BEC6" />
          <line
            x1="117"
            x2="193"
            y1={slideCenter(position)}
            y2={slideCenter(position)}
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {icon(locked, 252, slideCenter(lockPosition))}
          {icon(unlocked, 252, slideCenter(unlockPosition))}
          {Number.isFinite(switchPoint) && (
            <line
              x1="228"
              x2="278"
              y1={slideCenter(switchPoint)}
              y2={slideCenter(switchPoint)}
              stroke="#999"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}
        </>
      ) : (
        <>
          <image href={knob} x="40" y="40" width="220" height="220" transform={`rotate(${-position - 90} 150 150)`} />
          {icon(locked, ...radial(lockPosition))}
          {icon(unlocked, ...radial(unlockPosition))}
          {Number.isFinite(switchPoint) && (
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#999"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}
        </>
      )}
    </svg>
  );
}
