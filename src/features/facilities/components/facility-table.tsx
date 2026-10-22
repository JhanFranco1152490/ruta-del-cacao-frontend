import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { StatusBadge } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FACILITY_TYPES, facilityStatus } from '@/lib/facility-labels';

import type { PostharvestFacility } from '../api';
import { capacityText } from '../facility-form';
import { FacilityOccupiedBy } from './facility-occupied-by';

// En celular cada fila es una tarjeta: el nombre y su estado arriba, el tipo y la capacidad debajo,
// y el lote que lo ocupa solo si hay uno. Tocarla abre la hoja del elemento; en escritorio la fila
// elegida se resalta.
export function FacilityTable({
  facilities,
  selectedId,
  onSelect,
  lotHref,
  renderActions,
}: {
  facilities: readonly PostharvestFacility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  lotHref?: (id: string) => string;
  // El menú «⋯» de la fila; en celular las acciones van en la hoja.
  renderActions: (facility: PostharvestFacility) => ReactNode;
}) {
  return (
    <Table aria-label="Cajones y marquesinas" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre o código</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Capacidad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Ocupado por</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {facilities.map((facility) => {
          const type = FACILITY_TYPES[facility.facility_type];
          const status = facilityStatus(
            facility.status,
            facility.facility_type,
          );
          return (
            <TableRow
              data-state={facility.id === selectedId ? 'selected' : undefined}
              key={facility.id}
            >
              <TableCell className="font-bold text-selva max-md:order-1 max-md:col-span-1!">
                {facility.name}
                <button
                  aria-label={`Ver ${facility.name}`}
                  className={`${ROW_LINK_CLASS} flex items-center md:hidden ${FOCUS_OUTLINE_CLASS}`}
                  onClick={() => onSelect(facility.id)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </TableCell>
              <TableCell className="max-md:order-3 max-md:col-span-1!">
                <span className="inline-flex items-center gap-2">
                  <type.Icon aria-hidden="true" className="size-4" />
                  {type.label}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums max-md:order-4 max-md:col-span-1! max-md:justify-self-end">
                {capacityText(facility.capacity_kg)}
              </TableCell>
              <TableCell className="max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
                <StatusBadge icon={status.Icon} tone={status.tone}>
                  {status.label}
                </StatusBadge>
              </TableCell>
              <TableCell
                className={`max-md:order-5 ${facility.occupied_by ? '' : 'max-md:hidden'}`}
              >
                <FacilityOccupiedBy facility={facility} lotHref={lotHref} />
              </TableCell>
              <TableCell className="text-right max-md:hidden">
                {renderActions(facility)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
