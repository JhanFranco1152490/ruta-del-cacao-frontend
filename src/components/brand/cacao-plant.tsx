import { Ground, Leaf, Pod } from './cacao-parts';

// Una mata de cacao: tronco, hojas y dos mazorcas pegadas al tronco, como crecen en el árbol.
// Ilustración de acompañamiento (estados vacíos), nunca portadora de información.
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

export function CacaoPlant({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 140" aria-hidden="true">
      <Ground />
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
      {LEAVES.map((leaf) => (
        <Leaf key={`${leaf.x}-${leaf.y}-${leaf.angle}`} {...leaf} />
      ))}
      <Pod x={90} y={98} angle={-14} scale={1} fill="var(--amarillo-mazorca)" />
      <Pod x={72} y={110} angle={18} scale={0.78} fill="var(--morado-cacao)" />
    </svg>
  );
}
