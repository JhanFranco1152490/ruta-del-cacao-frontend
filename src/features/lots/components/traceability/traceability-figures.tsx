import { CheckCircle2, Medal, Sun, Thermometer } from 'lucide-react';

import { StatCell, StatStrip } from '@/components/page-blocks/stat-strip';

import type { PublicTraceability } from '../../public-traceability';
import {
  type TraceabilityFigure,
  traceabilityFigures,
} from '../../traceability-text';

const ICONS = {
  fermentation: Thermometer,
  drying: Sun,
  well_fermented: CheckCircle2,
  first_grade: Medal,
} satisfies Record<TraceabilityFigure['key'], unknown>;

// Cuatro cifras que se leen de un vistazo: cuánto duró cada etapa y qué tan bien salió el grano.
export function TraceabilityFigures({ data }: { data: PublicTraceability }) {
  return (
    <StatStrip accent="cobre" label="Cifras del lote">
      {traceabilityFigures(data).map((figure) => (
        <StatCell
          icon={ICONS[figure.key]}
          key={figure.key}
          label={figure.label}
          value={figure.value}
        />
      ))}
    </StatStrip>
  );
}
