import type { ReactNode } from 'react';

import { EditorLink } from '@/components/editor-link';
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
// ficha que tenía la parcela ese día, en pocas líneas para la columna angosta junto a la lista de
// etapas. Lo que ya dice la franja de cifras (peso, variedad, parcela) no se repite. El título va en
// tinta negra, no en el color del módulo. Los enlaces a la cosecha y a la ficha son de otros
// dominios: los da quien monta la pantalla, y sin ellos se muestra solo el texto.
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
  const rows: [string, ReactNode][] = [
    ['Cosecha', linkOrText(harvestHref, formatLongDate(harvest.harvest_date))],
    ['Finca', farmLabel(harvest.plot.farm)],
    // Sin conexión, la copia de poscosecha no trae el código de socio.
    ['Productor', lot.producer.member_code || '—'],
    [
      'Recolector',
      `${harvest.collector.full_name}${harvest.collector.is_active ? '' : ' · Cuenta inactiva'}`,
    ],
    [
      'Ficha de la parcela',
      linkOrText(historyHref, `Versión ${harvest.characterization_version}`),
    ],
  ];
  return (
    <section
      aria-label="Origen"
      className="space-y-2 rounded-[var(--radius-card)] bg-card p-4 shadow-card"
    >
      <h2 className="text-xs font-extrabold tracking-wider text-foreground uppercase">
        Origen
      </h2>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div className="flex justify-between gap-3" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-bold break-words">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
