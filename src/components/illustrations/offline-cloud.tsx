import {
  Ground,
  IllustrationFrame,
  Leaf,
} from '@/components/brand/cacao-parts';

// Una nube tachada sobre una mata que sigue creciendo: sin conexión, el trabajo sigue en el
// teléfono. Para los avisos de que falta conexión.
export function OfflineCloud({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={44} />
      <path
        d="M48 70 C40 70 34 64 34 56 C34 48 41 42 49 43 C51 32 61 26 72 28 C80 20 96 22 101 33 C112 32 122 40 122 52 C122 62 114 70 104 70Z"
        fill="var(--card)"
        stroke="var(--mazorca-negra)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M52 24 L110 78"
        stroke="var(--cobre)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M80 131 C78 120 81 108 79 96"
        stroke="var(--mazorca-negra)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <Leaf angle={-155} scale={0.6} x={80} y={114} />
      <Leaf angle={-25} scale={0.6} tone="var(--selva-2)" x={80} y={106} />
      <Leaf angle={-100} scale={0.5} x={79} y={98} />
    </IllustrationFrame>
  );
}
