import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { EditorLink } from '@/components/editor-link';
import { MaskedValue } from '@/components/masked-value';
import { buttonVariants } from '@/components/ui/button';
import { formatLongDate } from '@/lib/format/dates';

import type { Producer } from '../api';
import { ProducerStatusBadge } from './producer-status-badge';

function DataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-bold break-words text-foreground">{children}</dd>
    </div>
  );
}

type ProducerDataCardProps = {
  producer: Producer;
  municipalityName: (code: string) => string;
};

export function ProducerDataCard({
  producer,
  municipalityName,
}: ProducerDataCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Datos del productor</p>
          <h2 className="mt-2 text-2xl text-selva">Información registrada</h2>
        </div>
        <div className="flex items-center gap-2">
          <ProducerStatusBadge status={producer.status} />
          {/* El lápiz queda junto a los datos: en celular el botón de la cabecera queda lejos. */}
          <EditorLink
            aria-label="Editar datos del productor"
            className={buttonVariants({
              variant: 'action',
              size: 'icon',
              className: 'size-10',
            })}
            href={`/productores/${producer.id}/editar`}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </EditorLink>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DataItem label="Documento">
          <MaskedValue
            prefix={producer.document_type}
            value={producer.identity_document}
          />
        </DataItem>
        <DataItem label="Teléfono">
          {producer.phone ? (
            <MaskedValue value={producer.phone} />
          ) : (
            'Sin registrar'
          )}
        </DataItem>
        <DataItem label="Correo electrónico">
          {producer.email ? (
            <MaskedValue value={producer.email} />
          ) : (
            'Sin registrar'
          )}
        </DataItem>
        <DataItem label="Municipio">
          {municipalityName(producer.municipality_code)}
        </DataItem>
        <DataItem label="Vinculado desde">
          {formatLongDate(producer.joined_on)}
        </DataItem>
        <DataItem label="Código de asociado">{producer.member_code}</DataItem>
      </dl>
      <p className="mt-6 rounded-[var(--radius)] bg-info-bg px-4 py-3 text-sm font-medium text-info">
        Los datos sensibles se muestran protegidos en esta ficha. La consulta
        completa será controlada por la bitácora general.
      </p>
    </section>
  );
}
