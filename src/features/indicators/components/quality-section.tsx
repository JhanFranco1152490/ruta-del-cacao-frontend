import { ShareBar } from '@/components/charts/share-bar';
import { SectionCard } from '@/components/page-blocks/section-card';

import type { QualitySplit } from '../api';
import { qualitySegments } from '../indicator-charts';
import { formatKg } from '../indicator-format';

// El reparto de lo clasificado o descartado en el periodo, igual en los dos paneles. El del
// productor suma cuántos lotes fueron; el de la asociación no ve lotes.
export function QualitySection({
  quality,
  lots,
}: {
  quality: QualitySplit;
  lots?: { classified: number; discarded: number };
}) {
  const hasQuality = Number(quality.classified_kg) > 0;
  return (
    <SectionCard accent="cobre" title="Calidad">
      {hasQuality ? (
        <div className="space-y-3">
          <ShareBar
            label="Calidad de lo clasificado"
            segments={qualitySegments(quality)}
          />
          <p className="text-sm text-muted-foreground">
            {formatKg(quality.classified_kg)} clasificados o descartados en el
            periodo
            {lots &&
              `, en ${lots.classified} ${lots.classified === 1 ? 'lote clasificado' : 'lotes clasificados'} y ${lots.discarded} ${lots.discarded === 1 ? 'descartado' : 'descartados'}`}
            .
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">
          Ningún lote se clasificó ni se descartó en el periodo.
        </p>
      )}
    </SectionCard>
  );
}
