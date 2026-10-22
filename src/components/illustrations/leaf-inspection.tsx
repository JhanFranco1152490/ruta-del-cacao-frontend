import {
  Ground,
  IllustrationFrame,
  LEAF,
} from '@/components/brand/cacao-parts';

// Una hoja con manchas bajo la lupa: el monitoreo de plagas y enfermedades. Para Sanidad.
export function LeafInspection({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={46} />
      <g transform="translate(26 92) rotate(-28) scale(2.4)">
        <path d={LEAF} fill="var(--hoja)" />
        <path
          d="M2 0 H38 M12 0 L18 -5 M22 0 L28 -6 M14 0 L20 5 M24 0 L30 5"
          stroke="var(--crema)"
          strokeOpacity=".5"
          strokeWidth=".6"
          fill="none"
        />
      </g>
      <circle cx="72" cy="78" r="4" fill="var(--amarillo-mazorca)" />
      <circle cx="84" cy="70" r="3" fill="var(--morado-cacao)" />
      <circle cx="64" cy="88" r="2.5" fill="var(--morado-cacao)" />
      <circle
        cx="80"
        cy="76"
        r="22"
        fill="var(--card)"
        fillOpacity=".25"
        stroke="var(--mazorca-negra)"
        strokeWidth="4"
      />
      <path
        d="M96 92 L120 118"
        stroke="var(--cobre)"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </IllustrationFrame>
  );
}
