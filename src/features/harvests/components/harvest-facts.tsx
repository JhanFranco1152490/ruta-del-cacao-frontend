import Link from 'next/link';
import type { ReactNode } from 'react';

import { formatDecimal } from '@/lib/format/decimal';
import { formatDateTime, formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';

import type { Harvest } from '../api';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

// Lo registrado de una cosecha, con la versión de la ficha que tenía la parcela ese día.
export function HarvestFacts({
  harvest,
  historyHref,
}: {
  harvest: Harvest;
  historyHref?: (harvest: Harvest) => string;
}) {
  return (
    <dl className="grid gap-4 rounded-(--radius) border bg-card p-5 sm:grid-cols-2">
      <Fact label="Fecha">{formatLongDate(harvest.harvest_date)}</Fact>
      <Fact label="Parcela de origen">{plotLabel(harvest.plot)}</Fact>
      <Fact label="Finca">{farmLabel(harvest.plot.farm)}</Fact>
      <Fact label="Variedad">{harvest.variety.name}</Fact>
      <Fact label="Peso en verde">
        {formatDecimal(harvest.green_weight_kg, 1)} kg
      </Fact>
      <Fact label="Recolector">
        {harvest.collector.full_name}
        {!harvest.collector.is_active && ' · Cuenta inactiva'}
      </Fact>
      <Fact label="Registrada por">
        {harvest.registered_by?.full_name ?? 'Cuenta eliminada'} ·{' '}
        {formatDateTime(harvest.created_at)}
      </Fact>
      <Fact label="Ficha de la parcela">
        {historyHref ? (
          <Link className="underline" href={historyHref(harvest)}>
            Versión {harvest.characterization_version}
          </Link>
        ) : (
          `Versión ${harvest.characterization_version}`
        )}
      </Fact>
    </dl>
  );
}
