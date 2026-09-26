import { Eye, Pencil } from 'lucide-react';
import Link from 'next/link';

import { MaskedValue } from '@/components/masked-value';

import type { ProducerListItem } from '../api';
import { ProducerStatusBadge } from './producer-status-badge';

type ProducerTableProps = {
  producers: ProducerListItem[];
  municipalityName: (code: string) => string;
};

// Tabla nativa: los componentes de tabla de ui/ agregan bordes, resaltado al pasar el mouse,
// color de cabecera y texto sin salto de línea que cambiarían el aspecto de la lista.
export function ProducerTable({
  producers,
  municipalityName,
}: ProducerTableProps) {
  return (
    <table className="w-full min-w-[620px] table-fixed text-left text-sm lg:min-w-[900px]">
      <thead className="bg-surface-alt text-xs tracking-[0.1em] text-muted-foreground uppercase">
        <tr>
          <th className="w-[34%] px-4 py-3 font-extrabold lg:w-[32%]">
            Productor
          </th>
          <th className="hidden w-[20%] px-4 py-3 font-extrabold md:table-cell">
            Documento
          </th>
          <th className="hidden w-[15%] px-4 py-3 font-extrabold lg:table-cell">
            Municipio
          </th>
          <th className="w-[16%] px-4 py-3 font-extrabold lg:w-[15%]">
            Estado
          </th>
          <th className="w-[18%] px-4 py-3 text-left font-extrabold">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {producers.map((producer) => {
          const name = `${producer.first_name} ${producer.last_name}`;
          return (
            <tr className="border-t border-divider" key={producer.id}>
              <td className="px-4 py-4 font-bold">
                <p>{name}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {producer.member_code}
                </p>
              </td>
              <td className="hidden px-4 py-4 font-medium text-muted-foreground md:table-cell">
                <MaskedValue
                  prefix={producer.document_type}
                  value={producer.identity_document}
                />
              </td>
              <td className="hidden px-4 py-4 text-muted-foreground lg:table-cell">
                {municipalityName(producer.municipality_code)}
              </td>
              <td className="px-4 py-4">
                <ProducerStatusBadge status={producer.status} />
              </td>
              <td className="px-4 py-4 text-left">
                <div className="flex justify-start gap-2">
                  <Link
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-extrabold text-selva hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
                    href={`/productores/${producer.id}`}
                  >
                    <Eye aria-hidden="true" className="size-4" />
                    Ver<span className="sr-only"> ficha de {name}</span>
                  </Link>
                  <Link
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-selva px-3 text-xs font-extrabold text-white hover:bg-selva-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
                    href={`/productores/${producer.id}/editar`}
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    Editar<span className="sr-only"> ficha de {name}</span>
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
