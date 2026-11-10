import {
  Ground,
  IllustrationFrame,
  Leaf,
} from '@/components/brand/cacao-parts';

const BEANS = [
  [63, 63, -20],
  [76, 63, 25],
];

// Una báscula con un costal de cacao abierto encima y el recibo al lado: lo que se pesa para
// venderlo. Para Compradores, y después para Ventas.
export function BuyerScale({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={58} />
      <rect
        x="109"
        y="52"
        width="7"
        height="64"
        rx="2"
        fill="var(--mazorca-negra)"
      />
      <circle
        cx="112.5"
        cy="40"
        r="16"
        fill="var(--card)"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
      />
      <path
        d="M100.5 40 H103.5 M112.5 28 V31 M124.5 40 H121.5 M104 31.5 L106 33.5 M121 31.5 L119 33.5"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M112.5 40 L120 32"
        stroke="var(--cobre)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="112.5" cy="40" r="2.2" fill="var(--mazorca-negra)" />
      <rect x="28" y="113" width="92" height="9" rx="3" fill="var(--cobre)" />
      <rect
        x="34"
        y="122"
        width="80"
        height="4"
        rx="2"
        fill="var(--mazorca-negra)"
        fillOpacity=".35"
      />
      <circle cx="38" cy="127" r="3" fill="var(--mazorca-negra)" />
      <circle cx="110" cy="127" r="3" fill="var(--mazorca-negra)" />
      <path
        d="M46 64 C41 76 37 96 40 108 C41 113 47 114 60 114 H80 C93 114 98 113 99 108 C102 96 98 76 93 64Z"
        fill="var(--monilia)"
      />
      <path
        d="M43 84 C58 87 80 87 97 84 M40 100 C58 103 80 103 99 100"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".18"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M46 64 C55 56 84 56 93 64 C84 69 55 69 46 64Z"
        fill="var(--mazorca-negra)"
        fillOpacity=".25"
      />
      <path
        d="M51 61 C60 54 79 54 88 61"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <Leaf x={70} y={58} angle={-140} scale={0.62} />
      <Leaf x={70} y={58} angle={-70} scale={0.5} tone="var(--selva-2)" />
      {BEANS.map(([x, y, angle]) => (
        <ellipse
          cx={x}
          cy={y}
          fill="var(--morado-cacao)"
          key={`${x}-${y}`}
          rx="4.5"
          ry="3"
          transform={`rotate(${angle} ${x} ${y})`}
        />
      ))}
      <g transform="rotate(-9 24 104)">
        <path
          d="M12 88 H36 V118 L33 116 L30 118 L27 116 L24 118 L21 116 L18 118 L15 116 L12 118Z"
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M16 95 H32 M16 101 H28 M16 107 H31"
          stroke="var(--cobre)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
    </IllustrationFrame>
  );
}
