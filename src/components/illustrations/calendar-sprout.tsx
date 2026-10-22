import {
  Ground,
  IllustrationFrame,
  Sprout,
} from '@/components/brand/cacao-parts';

const DAYS = Array.from({ length: 12 }, (_, index) => ({
  x: 42 + (index % 4) * 17,
  y: 66 + Math.floor(index / 4) * 15,
}));

// Un calendario de labores con una mata que brota a su lado. Para las actividades.
export function CalendarSprout({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={50} />
      <rect
        x="34"
        y="36"
        width="78"
        height="86"
        rx="8"
        fill="var(--card)"
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
      />
      <path
        d="M34 44 a8 8 0 0 1 8 -8 h62 a8 8 0 0 1 8 8 v12 h-78Z"
        fill="var(--selva-2)"
      />
      <path
        d="M52 30 V42 M94 30 V42"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {DAYS.map(({ x, y }, index) => (
        <rect
          fill={index === 6 ? 'var(--amarillo-mazorca)' : 'var(--hoja-tint)'}
          height="10"
          key={`${x}-${y}`}
          rx="2"
          width="12"
          x={x}
          y={y}
        />
      ))}
      <Sprout
        stem="M128 130 C127 118 129 106 126 92"
        width={3}
        leaves={[
          { x: 127, y: 104, angle: -150, scale: 0.62 },
          { x: 127, y: 96, angle: -40, scale: 0.62, tone: 'var(--selva-2)' },
          { x: 126, y: 92, angle: -110, scale: 0.5 },
        ]}
      />
    </IllustrationFrame>
  );
}
