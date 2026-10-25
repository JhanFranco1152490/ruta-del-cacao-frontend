import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

const BEANS = [
  [58, 66],
  [72, 61],
  [88, 62],
  [102, 67],
  [66, 73],
  [96, 74],
];

// Un cajón de fermentación con la masa de cacao, su vapor y un termómetro. Para Fermentación.
export function FermentationBox({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={62} />
      <rect x="34" y="84" width="92" height="44" fill="var(--cobre)" />
      <path
        d="M34 98 H126 M34 112 H126"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".3"
        strokeWidth="2"
      />
      <rect x="30" y="78" width="100" height="7" fill="var(--mazorca-negra)" />
      <path
        d="M40 78 Q56 54 80 52 Q104 54 120 78Z"
        fill="var(--amarillo-mazorca)"
      />
      {BEANS.map(([cx, cy], index) => (
        <ellipse
          cx={cx}
          cy={cy}
          fill={index % 2 ? 'var(--morado-cacao)' : 'var(--cobre)'}
          key={cx}
          rx="3.4"
          ry="2.4"
        />
      ))}
      <path
        d="M64 44 Q58 36 64 28 Q70 20 64 12 M82 42 Q76 34 82 26 Q88 18 82 10 M100 44 Q94 36 100 28 Q106 20 100 12"
        stroke="var(--hoja)"
        strokeOpacity=".7"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="136"
        y="56"
        width="8"
        height="44"
        rx="4"
        fill="var(--card)"
        stroke="var(--mazorca-negra)"
        strokeWidth="2"
      />
      <circle cx="140" cy="104" r="7" fill="var(--morado-cacao)" />
      <rect x="139" y="72" width="2" height="30" fill="var(--morado-cacao)" />
    </IllustrationFrame>
  );
}
