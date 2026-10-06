// Una mata de cacao: tronco, hojas y dos mazorcas pegadas al tronco, como crecen en el árbol.
// Ilustración de acompañamiento (estados vacíos), nunca portadora de información.
const LEAF = 'M0 0 C9 -9 27 -11 42 0 C27 11 9 9 0 0Z';

const LEAVES: { x: number; y: number; angle: number; tone: string }[] = [
  { x: 79, y: 50, angle: -100, tone: 'var(--hoja)' },
  { x: 79, y: 52, angle: -60, tone: 'var(--selva-2)' },
  { x: 78, y: 54, angle: -138, tone: 'var(--selva-2)' },
  { x: 42, y: 60, angle: 192, tone: 'var(--hoja)' },
  { x: 54, y: 60, angle: 150, tone: 'var(--selva-2)' },
  { x: 60, y: 62, angle: 220, tone: 'var(--hoja)' },
  { x: 118, y: 46, angle: -14, tone: 'var(--hoja)' },
  { x: 106, y: 48, angle: 32, tone: 'var(--selva-2)' },
  { x: 100, y: 50, angle: -46, tone: 'var(--hoja)' },
];

function Pod({
  x,
  y,
  angle,
  scale,
  fill,
}: {
  x: number;
  y: number;
  angle: number;
  scale: number;
  fill: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path
        d="M0 -15 C7 -15 11 -5 11 4 C11 13 6 19 0 19 C-6 19 -11 13 -11 4 C-11 -5 -7 -15 0 -15Z"
        fill={fill}
      />
      <path
        d="M0 -14 V18 M-5 -11 C-8 -1 -8 10 -4 17 M5 -11 C8 -1 8 10 4 17"
        fill="none"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".35"
        strokeWidth="1.2"
      />
      <path
        d="M0 -15 V-19"
        stroke="var(--mazorca-negra)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function CacaoPlant({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 140" aria-hidden="true">
      <ellipse cx="80" cy="131" rx="44" ry="5" fill="var(--border)" />
      <g
        fill="none"
        stroke="var(--mazorca-negra)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M80 131 C77 108 83 84 79 52" strokeWidth="6" />
        <path d="M79 76 C68 68 56 62 42 60" strokeWidth="3" />
        <path d="M80 66 C92 56 104 50 118 46" strokeWidth="3" />
      </g>
      {LEAVES.map(({ x, y, angle, tone }) => (
        <g
          key={`${x}-${y}-${angle}`}
          transform={`translate(${x} ${y}) rotate(${angle})`}
        >
          <path d={LEAF} fill={tone} />
          <path
            d="M2 0 H38"
            stroke="var(--crema)"
            strokeOpacity=".45"
            strokeWidth="1"
          />
        </g>
      ))}
      <Pod x={90} y={98} angle={-14} scale={1} fill="var(--amarillo-mazorca)" />
      <Pod x={72} y={110} angle={18} scale={0.78} fill="var(--morado-cacao)" />
    </svg>
  );
}
