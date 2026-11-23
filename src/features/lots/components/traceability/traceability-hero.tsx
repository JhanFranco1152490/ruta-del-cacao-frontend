import { BotanicalVine } from '@/components/brand/botanical-vine';
import { DetailHero } from '@/components/page-blocks/detail-hero';

import type { PublicTraceability } from '../../public-traceability';
import {
  traceabilityHeadline,
  traceabilitySummary,
} from '../../traceability-text';

// La cabecera de la página: el lote se presenta por su variedad y su origen, con una frase que dice
// de qué finca viene y cuándo se cosechó y se guardó. La línea botánica en oro es solo ornamento.
export function TraceabilityHero({ data }: { data: PublicTraceability }) {
  return (
    <div className="relative">
      <DetailHero
        accent="cobre"
        description={traceabilitySummary(data)}
        eyebrow="Trazabilidad del lote"
        title={traceabilityHeadline(data.origin)}
        tone="bosque"
      />
      <BotanicalVine className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden h-full w-56 rounded-r-[var(--radius-card)] opacity-40 sm:block" />
    </div>
  );
}
