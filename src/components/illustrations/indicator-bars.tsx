import {
  Ground,
  IllustrationFrame,
  Leaf,
  Pod,
} from '@/components/brand/cacao-parts';

// Las tres barras del tablero, de la más baja a la más alta: x, alto y color.
const BARS = [
  [54, 26, 'var(--cobre)'],
  [72, 42, 'var(--hoja)'],
  [90, 58, 'var(--selva-2)'],
] as const;

const BASE = 104;

// Un tablero con tres barras de distinta altura y una mata que brota de la más alta, y una
// mazorca al pie: las cifras de lo cosechado y vendido. Para Indicadores.
export function IndicatorBars({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={56} />
      <rect
        x="40"
        y="28"
        width="80"
        height="84"
        rx="6"
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <path
        d={`M48 ${BASE} H112`}
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {BARS.map(([x, height, color]) => (
        <rect
          fill={color}
          height={height}
          key={x}
          rx="2"
          width="12"
          x={x}
          y={BASE - height}
        />
      ))}
      <path
        d="M96 46 C96 40 98 36 100 32"
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <Leaf angle={-35} scale={0.4} x={96} y={44} />
      <Leaf angle={-150} scale={0.35} tone="var(--selva-2)" x={97} y={40} />
      <Pod
        angle={20}
        fill="var(--amarillo-mazorca)"
        scale={0.5}
        x={122}
        y={112}
      />
    </IllustrationFrame>
  );
}
