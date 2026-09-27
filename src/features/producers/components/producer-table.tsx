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
// Por debajo de md cada fila pasa a ser una tarjeta (nombre y estado arriba, acciones abajo)
// para que todo quepa sin scroll horizontal. Cambiar el display de los elementos de tabla hace
// que algunos navegadores pierdan su semántica, por eso llevan el rol explícito.
export function ProducerTable({
  producers,
  municipalityName,
}: ProducerTableProps) {
  return (
    <table
      role="table"
      className="w-full table-fixed text-left text-sm max-md:block md:min-w-[620px] xl:min-w-[900px]"
    >
      <thead
        role="rowgroup"
        className="bg-surface-alt text-xs tracking-[0.1em] text-muted-foreground uppercase max-md:sr-only"
      >
        <tr role="row">
          <th
            role="columnheader"
            className="w-[34%] px-4 py-3 font-extrabold xl:w-[32%]"
          >
            Productor
          </th>
          <th
            role="columnheader"
            className="hidden w-[20%] px-4 py-3 font-extrabold md:table-cell"
          >
            Documento
          </th>
          <th
            role="columnheader"
            className="hidden w-[15%] px-4 py-3 font-extrabold xl:table-cell"
          >
            Municipio
          </th>
          <th
            role="columnheader"
            className="w-[16%] px-4 py-3 font-extrabold xl:w-[15%]"
          >
            Estado
          </th>
          <th
            role="columnheader"
            className="w-[18%] px-4 py-3 text-left font-extrabold"
          >
            Acciones
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup" className="max-md:block">
        {producers.map((producer) => {
          const name = `${producer.first_name} ${producer.last_name}`;
          return (
            <tr
              role="row"
              className="border-t border-divider max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-3 max-md:p-4"
              key={producer.id}
            >
              <td role="cell" className="px-4 py-4 font-bold max-md:p-0">
                <p>{name}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {producer.member_code}
                </p>
              </td>
              <td
                role="cell"
                className="hidden px-4 py-4 font-medium text-muted-foreground md:table-cell"
              >
                <MaskedValue
                  prefix={producer.document_type}
                  value={producer.identity_document}
                />
              </td>
              <td
                role="cell"
                className="hidden px-4 py-4 text-muted-foreground xl:table-cell"
              >
                {municipalityName(producer.municipality_code)}
              </td>
              <td role="cell" className="px-4 py-4 max-md:p-0">
                <ProducerStatusBadge status={producer.status} />
              </td>
              <td
                role="cell"
                className="px-4 py-4 text-left max-md:col-span-2 max-md:p-0"
              >
                <div className="flex flex-wrap justify-start gap-2">
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
