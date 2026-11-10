import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

// Las dos líneas del recibo, una por calibre: el grano y el valor de cada una.
const LINES = [44, 58];

// Los granos en la boca del costal y los que quedaron en el piso.
const BEANS = [
  [119, 94, -25],
  [126, 92, 15],
  [133, 95, -5],
  [100, 128, 30],
  [147, 129, -35],
];

// El recibo largo de una venta, con una línea por calibre y el total, y al pie el costal que se
// despachó. Para Ventas.
export function SaleReceipt({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={50} />
      <g transform="rotate(-5 78 70)">
        <path
          d="M48 18 C48 15 50 13 53 13 H103 C106 13 108 15 108 18 V118 L103 114 L98 118 L93 114 L88 118 L83 114 L78 118 L73 114 L68 118 L63 114 L58 118 L53 114 L48 118Z"
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path
          d="M48 18 C48 15 50 13 53 13 H103 C106 13 108 15 108 18 V28 H48Z"
          fill="var(--cobre)"
        />
        <path
          d="M56 21 H76"
          stroke="var(--card)"
          strokeOpacity=".7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {LINES.map((y) => (
          <g key={y}>
            <ellipse
              cx="59"
              cy={y}
              rx="4"
              ry="2.7"
              fill="var(--morado-cacao)"
              transform={`rotate(-20 59 ${y})`}
            />
            <path
              d={`M67 ${y} H82`}
              stroke="var(--mazorca-negra)"
              strokeOpacity=".35"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d={`M89 ${y} H100`}
              stroke="var(--cobre)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path
          d="M55 70 H101"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d="M56 82 H72 M84 82 H100"
          stroke="var(--mazorca-negra)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="66"
          cy="100"
          r="8"
          fill="none"
          stroke="var(--hoja)"
          strokeWidth="2"
        />
        <path
          d="M62 100 L65 103 L70.5 97"
          stroke="var(--hoja)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <path
        d="M111 96 C108 104 106 116 108 124 C109 128 113 129 122 129 H128 C137 129 141 128 142 124 C144 116 142 104 139 96Z"
        fill="var(--monilia)"
      />
      <path
        d="M108 112 C118 114 132 114 142 112"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".18"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M111 96 C116 91 134 91 139 96 C134 99 116 99 111 96Z"
        fill="var(--mazorca-negra)"
        fillOpacity=".25"
      />
      <path
        d="M114 93 C119 89 131 89 136 93"
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {BEANS.map(([x, y, angle]) => (
        <ellipse
          cx={x}
          cy={y}
          fill="var(--morado-cacao)"
          key={`${x}-${y}`}
          rx="4"
          ry="2.7"
          transform={`rotate(${angle} ${x} ${y})`}
        />
      ))}
    </IllustrationFrame>
  );
}
