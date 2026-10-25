import { EditorLink } from '@/components/editor-link';
import {
  KeyValue,
  KeyValues,
  SectionCard,
} from '@/components/page-blocks/section-card';
import { formatLongDate } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';

import type { Lot } from '../api';

const linkOrText = (href: string | undefined, text: string) =>
  href ? (
    <EditorLink className="underline" href={href}>
      {text}
    </EditorLink>
  ) : (
    text
  );

// De dónde sale el lote: su cosecha, la finca, el productor, quién recolectó y la versión de la
// ficha que tenía la parcela ese día. Lo que ya dice la franja de cifras (peso, variedad, parcela)
// no se repite. Los enlaces a la cosecha y a la ficha son de otros dominios: los da quien monta la
// pantalla, y sin ellos se muestra solo el texto.
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
    <SectionCard accent="cobre" id="lot-origin" title="Origen">
      <KeyValues single>
        <KeyValue label="Cosecha">
          {linkOrText(harvestHref, formatLongDate(harvest.harvest_date))}
        </KeyValue>
        <KeyValue label="Finca">{farmLabel(harvest.plot.farm)}</KeyValue>
        {/* Sin conexión, la copia de poscosecha no trae el código de socio. */}
        <KeyValue label="Productor">{lot.producer.member_code || '—'}</KeyValue>
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
      </KeyValues>
    </SectionCard>
  );
}
