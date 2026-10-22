import {
  Ground,
  IllustrationFrame,
  Leaf,
  Pod,
} from '@/components/brand/cacao-parts';

// Un canasto lleno de mazorcas recién cosechadas. Para Cosechas.
export function HarvestBasket({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={50} />
      <Leaf angle={-160} scale={0.8} x={60} y={70} tone="var(--selva-2)" />
      <Pod
        angle={-24}
        fill="var(--amarillo-mazorca)"
        scale={1.05}
        x={62}
        y={70}
      />
      <Pod angle={8} fill="var(--morado-cacao)" scale={1.1} x={82} y={64} />
      <Pod angle={30} fill="var(--amarillo-mazorca)" scale={1} x={102} y={72} />
      <path d="M34 82 H126 L114 128 H46Z" fill="var(--cobre)" />
      <path
        d="M38 94 H122 M41 106 H119 M44 118 H116"
        stroke="var(--crema)"
        strokeOpacity=".55"
        strokeWidth="2"
      />
      <path
        d="M58 82 L62 128 M80 82 V128 M102 82 L98 128"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".25"
        strokeWidth="2"
      />
      <path
        d="M34 82 H126"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </IllustrationFrame>
  );
}
