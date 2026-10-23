import { KeyValue } from '@/components/page-blocks/section-card';
import { EditorLink } from '@/components/editor-link';

import { formatDecimal } from '@/lib/format/decimal';
import { formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';

import type { Lot } from '../api';

const linkOrText = (href: string | undefined, text: string) =>
  href ? (
    <EditorLink className="underline" href={href}>
      {text}
    </EditorLink>
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
      <dl className="grid grid-cols-1 gap-4 rounded-(--radius) border bg-card p-5 sm:grid-cols-2">
        <KeyValue label="Cosecha">
          {linkOrText(harvestHref, formatLongDate(harvest.harvest_date))}
        </KeyValue>
        <KeyValue label="Peso en verde">
          {formatDecimal(lot.green_weight_kg, 1)} kg
        </KeyValue>
        <KeyValue label="Parcela">{plotLabel(harvest.plot)}</KeyValue>
        <KeyValue label="Finca">{farmLabel(harvest.plot.farm)}</KeyValue>
        {/* Sin conexión, la copia de poscosecha no trae el código de socio. */}
        <KeyValue label="Productor">{lot.producer.member_code || '—'}</KeyValue>
        <KeyValue label="Variedad">{harvest.variety.name}</KeyValue>
        <KeyValue label="Recolector">
          {harvest.collector.full_name}
          {!harvest.collector.is_active && ' · Cuenta inactiva'}
        </KeyValue>
        <KeyValue label="Ficha de la parcela">
          {linkOrText(
            historyHref,
            `Versión ${harvest.characterization_version}`,
          )}
        </KeyValue>
      </dl>
    </section>
  );
}
