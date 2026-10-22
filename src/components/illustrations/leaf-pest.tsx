import {
  Ground,
  IllustrationFrame,
  LEAF,
} from '@/components/brand/cacao-parts';

// Una hoja con un insecto encima: el catálogo de plagas y enfermedades. Para Plagas.
export function LeafPest({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={46} />
      <g transform="translate(24 104) rotate(-22) scale(2.6)">
        <path d={LEAF} fill="var(--selva-2)" />
        <path
          d="M2 0 H38"
          stroke="var(--crema)"
          strokeOpacity=".45"
          strokeWidth=".6"
        />
      </g>
      <g transform="translate(84 80) rotate(-22)">
        <path
          d="M-14 -8 L-22 -14 M-14 0 L-24 0 M-14 8 L-22 14 M14 -8 L22 -14 M14 0 L24 0 M14 8 L22 14 M-4 -14 L-8 -24 M4 -14 L8 -24"
          stroke="var(--mazorca-negra)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="0" cy="2" rx="14" ry="17" fill="var(--morado-cacao)" />
        <circle cx="0" cy="-15" r="7" fill="var(--mazorca-negra)" />
        <path
          d="M0 -12 V19"
          stroke="var(--mazorca-negra)"
          strokeOpacity=".4"
          strokeWidth="2"
        />
        <circle cx="-6" cy="0" r="2.5" fill="var(--amarillo-mazorca)" />
        <circle cx="6" cy="8" r="2.5" fill="var(--amarillo-mazorca)" />
      </g>
    </IllustrationFrame>
  );
}
