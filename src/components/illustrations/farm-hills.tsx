import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

const TREES = [
  { x: 30, y: 98, r: 9 },
  { x: 50, y: 88, r: 10 },
  { x: 72, y: 84, r: 9 },
  { x: 104, y: 104, r: 10 },
  { x: 126, y: 108, r: 9 },
];

// Una finca: dos lomas sembradas de cacao, la casa y el sol. Para las listas de fincas.
export function FarmHills({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={60} />
      <circle cx="126" cy="34" r="13" fill="var(--amarillo-mazorca)" />
      <path
        d="M14 128 C30 86 64 72 98 92 C110 100 116 112 120 128Z"
        fill="var(--map-level-2)"
      />
      <path
        d="M58 128 C76 102 112 92 148 112 L148 128Z"
        fill="var(--map-level-3)"
      />
      {TREES.map(({ x, y, r }) => (
        <g key={`${x}-${y}`}>
          <path
            d={`M${x} ${y + r - 2} V${y + r + 7}`}
            stroke="var(--mazorca-negra)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={x} cy={y} r={r} fill="var(--selva-2)" />
          <circle
            cx={x - r / 3}
            cy={y - r / 3}
            r={r / 2.6}
            fill="var(--hoja)"
          />
        </g>
      ))}
      <path d="M84 70 L98 58 L112 70Z" fill="var(--cobre)" />
      <rect x="87" y="70" width="22" height="16" fill="var(--crema)" />
      <rect x="95" y="76" width="6" height="10" fill="var(--mazorca-negra)" />
    </IllustrationFrame>
  );
}
