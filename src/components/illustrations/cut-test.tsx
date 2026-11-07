import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

// Cada grano partido muestra su interior: pardo si fermentó bien, morado si le faltó y gris pizarra
// si no fermentó. Es lo que se mira en la prueba de corte.
const HALVES = [
  { x: 40, y: 98, fill: 'var(--cobre)' },
  { x: 62, y: 104, fill: 'var(--morado-cacao)' },
  { x: 86, y: 98, fill: 'var(--cobre)' },
  { x: 108, y: 105, fill: 'var(--muted-foreground)' },
  { x: 52, y: 88, fill: 'var(--cobre)' },
] as const;

function HalfBean({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx="10" ry="6.5" fill="var(--mazorca-negra)" />
      <ellipse rx="8" ry="4.8" fill={fill} />
      <path
        d="M-5 0 H5 M-2 -3 L1 0 L-2 3"
        fill="none"
        stroke="var(--crema)"
        strokeOpacity=".55"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </g>
  );
}

// Granos partidos por la mitad sobre una tabla de corte, con la lupa encima. Para Calidad.
export function CutTest({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={58} />
      <path
        d="M18 112 L30 80 H134 L146 112Z"
        fill="var(--amarillo-mazorca)"
        fillOpacity=".55"
      />
      <path d="M18 112 H146 V120 H18Z" fill="var(--cobre)" />
      <path
        d="M40 88 H124 M34 100 H130"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".15"
        strokeWidth="1.5"
      />
      {HALVES.map((half) => (
        <HalfBean key={`${half.x}-${half.y}`} {...half} />
      ))}
      <circle cx="104" cy="56" r="21" fill="var(--card)" />
      <g transform="translate(104 56) scale(1.6)">
        <HalfBean x={0} y={0} fill="var(--morado-cacao)" />
      </g>
      <circle
        cx="104"
        cy="56"
        r="21"
        fill="none"
        stroke="var(--mazorca-negra)"
        strokeWidth="4"
      />
      <path
        d="M119 41 L138 22"
        stroke="var(--hoja)"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </IllustrationFrame>
  );
}
