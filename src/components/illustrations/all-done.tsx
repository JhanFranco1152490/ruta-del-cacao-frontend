import {
  Ground,
  IllustrationFrame,
  Leaf,
} from '@/components/brand/cacao-parts';

// Una mata pequeña junto a un visto bueno: no queda nada por hacer. Para Pendiente y la bandeja
// de avisos vacía.
export function AllDone({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={48} />
      <circle cx="100" cy="64" r="28" fill="var(--hoja-tint)" />
      <path
        d="M86 64 L96 74 L116 52"
        stroke="var(--selva-2)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M54 131 C52 116 56 102 53 86"
        stroke="var(--mazorca-negra)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <Leaf angle={-150} scale={0.75} x={54} y={104} />
      <Leaf angle={-30} scale={0.7} tone="var(--selva-2)" x={54} y={96} />
      <Leaf angle={-95} scale={0.65} x={53} y={88} />
    </IllustrationFrame>
  );
}
