import {
  Ground,
  IllustrationFrame,
  Leaf,
} from '@/components/brand/cacao-parts';

// Un bulto de abono y una bomba de aspersión: los insumos de la bodega. Para Insumos.
export function InputSupplies({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={54} />
      <path
        d="M30 58 H82 L86 126 C86 129 84 130 80 130 H32 C28 130 26 129 26 126Z"
        fill="var(--crema)"
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M30 58 L36 50 H76 L82 58Z"
        fill="var(--mazorca-negra)"
        fillOpacity=".25"
      />
      <circle cx="56" cy="94" r="15" fill="var(--hoja-tint)" />
      <Leaf angle={-45} scale={0.5} x={48} y={102} />
      <rect x="98" y="72" width="34" height="56" rx="10" fill="var(--hoja)" />
      <rect
        x="104"
        y="84"
        width="22"
        height="18"
        rx="3"
        fill="var(--card)"
        fillOpacity=".8"
      />
      <path
        d="M115 72 V62 H128 L140 54"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M144 50 l6 -3 M145 56 l7 1 M141 46 l2 -6"
        stroke="var(--selva-2)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IllustrationFrame>
  );
}
