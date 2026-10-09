import Link from 'next/link';

import { ProducerLine } from '@/components/producer-line';

import type { OverviewFarm } from '../plot-overview';

// De qué finca es la parcela en una lista que junta todas, y de qué productor para quien ve las
// de varios. El nombre lleva a la finca, donde la parcela se edita.
export function PlotFarmLine({
  farm,
  farmHref,
  showProducer = false,
  canOpenProducer = false,
}: {
  farm: OverviewFarm;
  farmHref?: (farmId: string) => string;
  showProducer?: boolean;
  canOpenProducer?: boolean;
}) {
  // Una parcela nueva de una finca que tampoco ha llegado al servidor todavía no tiene nombre.
  const name = farm.name ?? 'Finca pendiente de sincronizar';
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Finca:{' '}
        {farmHref ? (
          <Link
            className="font-bold text-foreground underline underline-offset-4"
            href={farmHref(farm.id)}
          >
            {name}
          </Link>
        ) : (
          <strong className="text-foreground">{name}</strong>
        )}
        {!farm.isActive && ' (inactiva)'}
      </p>
      {showProducer && farm.producer && (
        <ProducerLine linkable={canOpenProducer} producer={farm.producer} />
      )}
    </>
  );
}
