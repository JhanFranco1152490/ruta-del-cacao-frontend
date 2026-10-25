import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

const BEANS = [
  [34, 92],
  [46, 89],
  [58, 92],
  [70, 89],
  [82, 92],
  [94, 89],
  [106, 92],
  [118, 89],
  [130, 92],
];

const RAYS = [
  'M126 12 V18',
  'M126 50 V56',
  'M104 34 H110',
  'M142 34 H148',
  'M110 18 L114 22',
  'M138 46 L142 50',
  'M142 18 L138 22',
  'M114 46 L110 50',
];

// Una bandeja de secado al sol, con el grano extendido, un rastrillo y el sol encima. Para Secado.
export function SunDryingTray({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={62} />
      <circle cx="126" cy="34" r="12" fill="var(--amarillo-mazorca)" />
      <path
        d={RAYS.join(' ')}
        stroke="var(--amarillo-mazorca)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 100 V128 M126 100 V128"
        stroke="var(--mazorca-negra)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="22" y="98" width="116" height="7" fill="var(--cobre)" />
      <path
        d="M26 98 Q80 80 134 98Z"
        fill="var(--mazorca-negra)"
        fillOpacity=".12"
      />
      {BEANS.map(([cx, cy], index) => (
        <ellipse
          cx={cx}
          cy={cy}
          fill={index % 2 ? 'var(--morado-cacao)' : 'var(--cobre)'}
          key={cx}
          rx="5"
          ry="3.2"
        />
      ))}
      <path
        d="M50 62 L96 100"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M42 70 L60 56 M44 76 L62 62"
        stroke="var(--hoja)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </IllustrationFrame>
  );
}
