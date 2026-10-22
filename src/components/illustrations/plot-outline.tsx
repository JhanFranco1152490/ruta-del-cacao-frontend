import {
  Ground,
  IllustrationFrame,
  Leaf,
} from '@/components/brand/cacao-parts';

const CORNERS = [
  [26, 96],
  [70, 70],
  [138, 86],
  [116, 124],
  [40, 122],
];

const SPROUTS = [
  [62, 104],
  [88, 96],
  [102, 112],
];

// Una parcela: su contorno con los vértices marcados, como en el editor del mapa, y unas matas
// recién sembradas adentro. Para las listas y secciones de parcelas.
export function PlotOutline({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={58} />
      <polygon
        points={CORNERS.map((point) => point.join(',')).join(' ')}
        fill="var(--hoja-tint)"
        stroke="var(--selva-2)"
        strokeDasharray="5 4"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {SPROUTS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path
            d={`M${x} ${y} V${y - 12}`}
            stroke="var(--mazorca-negra)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Leaf angle={-140} scale={0.32} x={x} y={y - 10} />
          <Leaf
            angle={-40}
            scale={0.32}
            tone="var(--selva-2)"
            x={x}
            y={y - 12}
          />
        </g>
      ))}
      {CORNERS.map(([x, y]) => (
        <circle
          cx={x}
          cy={y}
          fill="var(--card)"
          key={`${x}-${y}`}
          r="4.5"
          stroke="var(--selva-2)"
          strokeWidth="2.5"
        />
      ))}
      <path
        d="M138 86 V52"
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M139 53 L156 59 L139 66Z" fill="var(--cobre)" />
    </IllustrationFrame>
  );
}
