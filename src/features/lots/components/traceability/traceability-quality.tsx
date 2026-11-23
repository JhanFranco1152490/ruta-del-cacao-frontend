import { SectionCard } from '@/components/page-blocks/section-card';

import type { PublicTraceability } from '../../public-traceability';
import { type GradeShare, gradeShares } from '../../traceability-text';

const TONES: Record<GradeShare['key'], string> = {
  g1: 'bg-ok',
  g2: 'bg-info',
  discard: 'bg-err',
};

// Cómo se repartió el cacao seco al clasificarlo: una sola barra y su leyenda. Cada calibre lleva su
// nombre y su número, además del color.
export function TraceabilityQuality({
  quality,
}: {
  quality: PublicTraceability['quality'];
}) {
  const shares = gradeShares(quality);
  if (shares.length === 0) return null;
  const summary = shares
    .map((share) => `${share.label} ${share.text}`)
    .join(', ');
  return (
    <SectionCard accent="cobre" title="Calidad">
      <p className="text-sm font-semibold text-muted-foreground">
        Así se repartió el cacao seco al clasificarlo
      </p>
      <div
        aria-label={`Reparto del cacao seco: ${summary}`}
        className="mt-3 flex h-4 gap-0.5 overflow-hidden rounded-full"
        role="img"
      >
        {shares.map((share) => (
          <div
            className={TONES[share.key]}
            key={share.key}
            style={{ width: `${share.value}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {shares.map((share) => (
          <li className="flex items-start gap-3" key={share.key}>
            <span
              aria-hidden="true"
              className={`mt-1.5 size-3 shrink-0 rounded-full ${TONES[share.key]}`}
            />
            <p className="min-w-0 flex-1 text-sm font-bold">
              {share.label}
              <span className="block font-normal text-muted-foreground">
                {share.note}
              </span>
            </p>
            <p className="shrink-0 font-serif text-xl whitespace-nowrap tabular-nums">
              {share.text}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
