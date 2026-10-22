import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

const BEANS = [
  [104, 124, -20],
  [114, 128, 30],
  [124, 123, 10],
  [96, 129, 60],
  [132, 129, -40],
];

// Un costal de grano con su etiqueta de lote y unos granos afuera. Para Lotes.
export function BeanSack({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={52} />
      <path
        d="M50 50 C44 66 38 92 42 118 C44 128 52 130 70 130 H86 C104 130 112 128 114 118 C118 92 112 66 106 50Z"
        fill="var(--monilia)"
      />
      <path
        d="M46 72 C66 76 92 76 110 72 M43 98 C66 102 92 102 113 98"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".18"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M50 50 C60 40 96 40 106 50 C96 56 60 56 50 50Z"
        fill="var(--mazorca-negra)"
        fillOpacity=".25"
      />
      <path
        d="M56 46 C66 38 90 38 100 46"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="62" y="80" width="32" height="20" rx="3" fill="var(--card)" />
      <path
        d="M67 87 H89 M67 93 H82"
        stroke="var(--cobre)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {BEANS.map(([x, y, angle]) => (
        <ellipse
          cx={x}
          cy={y}
          fill="var(--morado-cacao)"
          key={`${x}-${y}`}
          rx="5"
          ry="3.2"
          transform={`rotate(${angle} ${x} ${y})`}
        />
      ))}
    </IllustrationFrame>
  );
}
