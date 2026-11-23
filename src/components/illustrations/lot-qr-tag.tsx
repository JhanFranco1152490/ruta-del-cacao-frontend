import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

// Los cuadros del código QR de la etiqueta: columna y fila de cada uno, en una rejilla de 5 × 5.
const CELLS = [
  [0, 0],
  [1, 0],
  [2, 0],
  [4, 0],
  [0, 1],
  [2, 1],
  [3, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [4, 2],
  [1, 3],
  [3, 3],
  [4, 3],
  [0, 4],
  [2, 4],
  [4, 4],
];

const CELL = 7;
const ORIGIN_X = 55;
const ORIGIN_Y = 44;

// La etiqueta de un saco con su código QR y una lupa. Para la página pública de trazabilidad.
export function LotQrTag({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={52} />
      <path
        d="M80 12 C80 20 80 22 80 28"
        stroke="var(--cobre)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect
        x="42"
        y="26"
        width="76"
        height="98"
        rx="8"
        fill="var(--card)"
        stroke="var(--cobre)"
        strokeWidth="3"
      />
      <circle cx="80" cy="34" r="3.5" fill="var(--border)" />
      {CELLS.map(([column, row]) => (
        <rect
          fill="var(--mazorca-negra)"
          height={CELL - 1}
          key={`${column}-${row}`}
          rx="1"
          width={CELL - 1}
          x={ORIGIN_X + column * CELL}
          y={ORIGIN_Y + row * CELL}
        />
      ))}
      <path
        d="M54 98 H106 M54 108 H92"
        stroke="var(--cobre)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="112"
        cy="96"
        r="17"
        fill="var(--card)"
        fillOpacity=".85"
        stroke="var(--selva)"
        strokeWidth="4"
      />
      <path
        d="M124 108 L138 122"
        stroke="var(--selva)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M107 91 C107 85 117 85 117 91 C117 95 112 95 112 100 M112 105 V106"
        stroke="var(--cobre)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </IllustrationFrame>
  );
}
