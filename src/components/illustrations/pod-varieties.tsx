import { Ground, IllustrationFrame, Pod } from '@/components/brand/cacao-parts';

// Tres mazorcas de distinto color y forma: el catálogo de variedades. Para Variedades.
export function PodVarieties({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={56} />
      <Pod angle={-12} fill="var(--amarillo-mazorca)" scale={2} x={46} y={92} />
      <Pod angle={0} fill="var(--morado-cacao)" scale={2.2} x={80} y={88} />
      <Pod angle={14} fill="var(--hoja)" scale={1.9} x={114} y={94} />
    </IllustrationFrame>
  );
}
