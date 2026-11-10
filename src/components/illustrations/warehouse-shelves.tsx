import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

// Cada costal: su centro, el piso de la repisa en que se apoya, su ancho, su alto y si lleva la
// etiqueta del lote.
const SACKS = [
  { x: 70, y: 49, w: 26, h: 18 },
  { x: 98, y: 49, w: 20, h: 14 },
  { x: 54, y: 85, w: 30, h: 26, label: true },
  { x: 86, y: 85, w: 30, h: 24 },
  { x: 113, y: 85, w: 20, h: 16 },
  { x: 50, y: 121, w: 32, h: 28 },
  { x: 82, y: 121, w: 32, h: 30, label: true },
  { x: 112, y: 121, w: 24, h: 22 },
];

const SHELVES = [49, 85, 121];

const BEANS = [
  [128, 131, 20],
  [137, 129, -30],
];

function Sack({
  x,
  y,
  w,
  h,
  label = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: boolean;
}) {
  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h;
  const neck = w * 0.14;
  const seam = y - h * 0.45;
  const tag = y - h * 0.62;
  return (
    <g>
      <path
        d={`M${left + 3} ${y} C${left - 1} ${y - h * 0.55} ${left + 3} ${top + 9} ${x - neck} ${top + 3} H${x + neck} C${right - 3} ${top + 9} ${right + 1} ${y - h * 0.55} ${right - 3} ${y}Z`}
        fill="var(--monilia)"
      />
      <path
        d={`M${x - neck} ${top + 3} L${x - neck - 4} ${top - 4} L${x - neck / 2} ${top - 1} L${x} ${top - 5} L${x + neck / 2} ${top - 1} L${x + neck + 4} ${top - 4} L${x + neck} ${top + 3}Z`}
        fill="var(--monilia)"
      />
      <path
        d={`M${x - neck - 1} ${top + 3} H${x + neck + 1}`}
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d={`M${left + 2} ${seam} C${x - w * 0.2} ${seam + h * 0.05} ${x + w * 0.2} ${seam + h * 0.05} ${right - 2} ${seam}`}
        stroke="var(--mazorca-negra)"
        strokeOpacity=".18"
        strokeWidth="1.5"
        fill="none"
      />
      {label && (
        <>
          <rect
            x={x - 8}
            y={tag}
            width="16"
            height="10"
            rx="2"
            fill="var(--card)"
          />
          <path
            d={`M${x - 5} ${tag + 4} H${x + 5} M${x - 5} ${tag + 7} H${x + 2}`}
            stroke="var(--cobre)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

// Un estante de bodega con costales de cacao seco amarrados, dos con su etiqueta de lote. Para
// Bodega.
export function WarehouseShelves({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={60} />
      <rect
        x="31"
        y="26"
        width="98"
        height="99"
        fill="var(--cobre)"
        fillOpacity=".12"
      />
      <rect x="26" y="26" width="5" height="104" rx="1.5" fill="var(--cobre)" />
      <rect
        x="129"
        y="26"
        width="5"
        height="104"
        rx="1.5"
        fill="var(--cobre)"
      />
      {SACKS.map((sack) => (
        <Sack key={`${sack.x}-${sack.y}`} {...sack} />
      ))}
      {SHELVES.map((y) => (
        <rect
          fill="var(--cobre)"
          height="5"
          key={y}
          rx="1.5"
          width="116"
          x="22"
          y={y}
        />
      ))}
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
    </IllustrationFrame>
  );
}
