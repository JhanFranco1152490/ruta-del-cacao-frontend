import Link from 'next/link';

import { KeyValue } from '@/components/page-blocks/section-card';
import { formatDecimal } from '@/lib/format/decimal';
import { formatDateTime, formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';

import type { Harvest } from '../api';

// Lo registrado de una cosecha, con la versión de la ficha que tenía la parcela ese día.
export function HarvestFacts({
  harvest,
  historyHref,
}: {
  harvest: Harvest;
  historyHref?: (harvest: Harvest) => string;
}) {
  return (
    <dl className="grid grid-cols-1 gap-4 rounded-(--radius) border bg-card p-5 sm:grid-cols-2">
      <KeyValue label="Fecha">{formatLongDate(harvest.harvest_date)}</KeyValue>
      <KeyValue label="Parcela de origen">{plotLabel(harvest.plot)}</KeyValue>
      <KeyValue label="Finca">{farmLabel(harvest.plot.farm)}</KeyValue>
      <KeyValue label="Variedad">{harvest.variety.name}</KeyValue>
      <KeyValue label="Peso en verde">
        {formatDecimal(harvest.green_weight_kg, 1)} kg
      </KeyValue>
      <KeyValue label="Recolector">
        {harvest.collector.full_name}
        {!harvest.collector.is_active && ' · Cuenta inactiva'}
      </KeyValue>
      <KeyValue label="Registrada por">
        {harvest.registered_by?.full_name ?? 'Cuenta eliminada'} ·{' '}
        {formatDateTime(harvest.created_at)}
      </KeyValue>
      <KeyValue label="Ficha de la parcela">
        {historyHref ? (
          <Link className="underline" href={historyHref(harvest)}>
            Versión {harvest.characterization_version}
          </Link>
        ) : (
          `Versión ${harvest.characterization_version}`
        )}
      </KeyValue>
    </dl>
  );
}
