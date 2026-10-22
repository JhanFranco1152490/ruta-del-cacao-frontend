import {
  Ground,
  IllustrationFrame,
  Leaf,
  Pod,
} from '@/components/brand/cacao-parts';

// Un sombrero de trabajo sobre una rama con una mazorca: las personas del campo. Para Productores,
// Usuarios y Roles.
export function FarmerHat({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={50} />
      <path
        d="M40 128 C60 112 92 106 124 112"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <Leaf angle={-170} scale={0.7} x={62} y={116} tone="var(--selva-2)" />
      <Leaf angle={-20} scale={0.75} x={100} y={109} />
      <Pod
        angle={20}
        fill="var(--amarillo-mazorca)"
        scale={0.85}
        x={116}
        y={124}
      />
      <ellipse cx="78" cy="82" rx="54" ry="13" fill="var(--amarillo-mazorca)" />
      <path
        d="M52 80 C52 58 60 44 78 44 C96 44 104 58 104 80Z"
        fill="var(--amarillo-mazorca)"
      />
      <path d="M53 72 H103 V79 H53Z" fill="var(--mazorca-negra)" />
      <path
        d="M30 84 C56 96 100 96 126 84"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".2"
        strokeWidth="2"
        fill="none"
      />
    </IllustrationFrame>
  );
}
