import {
  Ground,
  IllustrationFrame,
  Leaf,
} from '@/components/brand/cacao-parts';

// Los renglones de cada página y el largo de lo escrito en ellos.
const LEFT_ROWS = [
  { y: 46, width: 30 },
  { y: 57, width: 24 },
  { y: 79, width: 20 },
  { y: 90, width: 26 },
];
const RIGHT_ROWS = [
  { y: 46, width: 26 },
  { y: 57, width: 30 },
  { y: 79, width: 24 },
  { y: 90, width: 18 },
];
// El renglón que cambió: tachado a la izquierda y resaltado en cobre a la derecha.
const CHANGED_ROW = 68;

// Una libreta abierta: a la izquierda un renglón tachado, a la derecha el mismo resaltado en cobre,
// un lápiz encima y una hoja de cacao al pie. Lo anterior y lo nuevo de cada cambio. Para la
// Bitácora de cambios.
export function ChangeLedger({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={56} />
      <path
        d="M26 34 C44 30 64 31 80 36 C96 31 116 30 134 34 V118 C116 114 96 115 80 120 C64 115 44 114 26 118Z"
        fill="var(--selva-2)"
      />
      <path
        d="M30 28 C46 25 64 26 80 31 V114 C64 109 46 108 30 111Z"
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <path
        d="M80 31 C96 26 114 25 130 28 V111 C114 108 96 109 80 114Z"
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <path d="M80 31 V114" stroke="var(--border)" strokeWidth="2" />
      {LEFT_ROWS.map(({ y, width }) => (
        <path
          d={`M38 ${y} H${38 + width}`}
          key={y}
          stroke="var(--mazorca-negra)"
          strokeLinecap="round"
          strokeOpacity=".3"
          strokeWidth="2"
        />
      ))}
      <rect
        fill="var(--mazorca-negra)"
        fillOpacity=".16"
        height="6"
        rx="3"
        width="28"
        x="38"
        y={CHANGED_ROW - 3}
      />
      <path
        d={`M34 ${CHANGED_ROW + 1} L70 ${CHANGED_ROW - 1}`}
        stroke="var(--mazorca-negra)"
        strokeLinecap="round"
        strokeOpacity=".75"
        strokeWidth="1.5"
      />
      {RIGHT_ROWS.map(({ y, width }) => (
        <path
          d={`M88 ${y} H${88 + width}`}
          key={y}
          stroke="var(--mazorca-negra)"
          strokeLinecap="round"
          strokeOpacity=".3"
          strokeWidth="2"
        />
      ))}
      <rect
        fill="var(--cobre)"
        fillOpacity=".14"
        height="9"
        rx="2"
        width="38"
        x="85"
        y={CHANGED_ROW - 4.5}
      />
      <path
        d={`M88 ${CHANGED_ROW} H${88 + 28}`}
        stroke="var(--cobre)"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <g transform="translate(108 120) rotate(-40)">
        <path d="M0 -3.5 H34 V3.5 H0Z" fill="var(--amarillo-mazorca)" />
        <path d="M0 0 H34" stroke="var(--cobre)" strokeOpacity=".35" />
        <path
          d="M34 -3.5 H40 C41 -3.5 42 -2.5 42 -1.5 V1.5 C42 2.5 41 3.5 40 3.5 H34Z"
          fill="var(--morado-cacao)"
        />
        <path d="M0 -3.5 L-9 0 L0 3.5Z" fill="var(--cobre)" fillOpacity=".35" />
        <path d="M-6 -1.2 L-9 0 L-6 1.2Z" fill="var(--mazorca-negra)" />
      </g>
      <Leaf angle={-12} scale={0.7} tone="var(--hoja)" x={12} y={129} />
      <Leaf angle={-78} scale={0.5} tone="var(--selva-2)" x={12} y={129} />
    </IllustrationFrame>
  );
}
