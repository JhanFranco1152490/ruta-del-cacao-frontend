import {
  Ground,
  IllustrationFrame,
  Leaf,
  Pod,
} from '@/components/brand/cacao-parts';

// Las filas de la hoja, debajo del encabezado.
const ROWS = [44, 55, 66, 77, 88, 99];

// Las columnas: dónde empieza cada una y el largo de su dato. La tercera es la resaltada.
const COLUMNS = [
  { x: 46, width: 10 },
  { x: 62, width: 8 },
  { x: 76, width: 9 },
];

// Una hoja de cálculo con su encabezado y una columna resaltada en cobre, otra hoja detrás y una
// mazorca al pie: las cifras de la unidad productiva, fila por fila. Para Reportes.
export function ReportSheets({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={52} />
      <g transform="rotate(7 92 70)">
        <path
          d="M66 20 H116 C118 20 120 22 120 24 V118 C120 120 118 122 116 122 H66 C64 122 62 120 62 118 V24 C62 22 64 20 66 20Z"
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        {[40, 52, 64, 76].map((y) => (
          <path
            d={`M72 ${y} H110`}
            key={y}
            stroke="var(--border)"
            strokeWidth="1.5"
          />
        ))}
      </g>
      <g transform="rotate(-5 70 68)">
        <path
          d="M42 16 H88 L100 28 V114 C100 116 98 118 96 118 H42 C40 118 38 116 38 114 V20 C38 18 40 16 42 16Z"
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <path d="M88 16 V26 C88 27 89 28 90 28 H100Z" fill="var(--border)" />
        <path d="M40 24 H86 V34 H40Z" fill="var(--selva-2)" />
        <path
          d="M45 29 H54 M61 29 H68"
          stroke="var(--card)"
          strokeOpacity=".75"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M73 34 H88 V108 H73Z" fill="var(--cobre)" fillOpacity=".14" />
        <path
          d="M76 29 H85"
          stroke="var(--amarillo-mazorca)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {ROWS.map((y) => (
          <g key={y}>
            <path
              d={`M42 ${y + 5} H96`}
              stroke="var(--border)"
              strokeWidth="1"
            />
            {COLUMNS.map(({ x, width }, index) => (
              <path
                d={`M${x} ${y} H${x + width}`}
                key={x}
                stroke={index === 2 ? 'var(--cobre)' : 'var(--mazorca-negra)'}
                strokeOpacity={index === 2 ? 1 : 0.3}
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
      </g>
      <Leaf angle={200} scale={0.6} tone="var(--hoja)" x={122} y={124} />
      <Pod
        angle={18}
        fill="var(--amarillo-mazorca)"
        scale={0.85}
        x={124}
        y={110}
      />
    </IllustrationFrame>
  );
}
