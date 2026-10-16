import Link from 'next/link';
import type { ReactNode } from 'react';

import { formatDecimal } from '@/lib/format/decimal';
import { formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';

import type { Lot } from '../api';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

const linkOrText = (href: string | undefined, text: string) =>
  href ? (
    <Link className="underline" href={href}>
      {text}
    </Link>
  ) : (
    text
  );

// De dónde sale el lote: su cosecha, con la parcela, la finca, el productor y la versión de la
// ficha que tenía la parcela ese día. Los enlaces a la cosecha y a la ficha son de otros dominios:
// los da quien monta la pantalla, y sin ellos se muestra solo el texto.
export function LotOrigin({
  lot,
  harvestHref,
  historyHref,
}: {
  lot: Lot;
  harvestHref?: string;
  historyHref?: string;
}) {
  const { harvest } = lot;
  return (
    <section aria-labelledby="lot-origin-title" className="space-y-3">
      <h2 className="text-lg font-bold" id="lot-origin-title">
        Origen
      </h2>
      <dl className="grid gap-4 rounded-(--radius) border bg-card p-5 sm:grid-cols-2">
        <Fact label="Cosecha">
          {linkOrText(harvestHref, formatLongDate(harvest.harvest_date))}
        </Fact>
        <Fact label="Peso en verde">
          {formatDecimal(lot.green_weight_kg, 1)} kg
        </Fact>
        <Fact label="Parcela">{plotLabel(harvest.plot)}</Fact>
        <Fact label="Finca">{farmLabel(harvest.plot.farm)}</Fact>
        <Fact label="Productor">{lot.producer.member_code}</Fact>
        <Fact label="Variedad">{harvest.variety.name}</Fact>
        <Fact label="Recolector">
          {harvest.collector.full_name}
          {!harvest.collector.is_active && ' · Cuenta inactiva'}
        </Fact>
        <Fact label="Ficha de la parcela">
          {linkOrText(
            historyHref,
            `Versión ${harvest.characterization_version}`,
          )}
        </Fact>
      </dl>
    </section>
  );
}
