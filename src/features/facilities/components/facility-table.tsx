import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { StatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatShortDayMonth } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { FACILITY_TYPES, facilityStatus } from '@/lib/facility-labels';

import type { PostharvestFacility } from '../api';

function OccupiedBy({ facility }: { facility: PostharvestFacility }) {
  if (!facility.occupied_by) return <span aria-label="Sin lote">—</span>;
  const { lot, since } = facility.occupied_by;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="font-mono text-xs">{lot.code}</span>
      <span className="text-sm text-muted-foreground">
        desde el {formatShortDayMonth(since)}
      </span>
    </span>
  );
}

// En celular cada fila es una tarjeta: el nombre y su estado arriba, el tipo y la capacidad debajo,
// y el lote que lo ocupa solo si hay uno.
export function FacilityTable({
  facilities,
}: {
  facilities: readonly PostharvestFacility[];
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
            <TableRow key={facility.id}>
              <TableCell className="font-bold text-selva max-md:order-1 max-md:col-span-1">
                {facility.name}
              </TableCell>
              <TableCell className="max-md:order-3 max-md:col-span-1">
                <span className="inline-flex items-center gap-2">
                  <type.Icon aria-hidden="true" className="size-4" />
                  {type.label}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums max-md:order-4 max-md:col-span-1 max-md:justify-self-end">
                {formatDecimal(facility.capacity_kg, 0)} kg
              </TableCell>
              <TableCell className="max-md:order-2 max-md:col-span-1 max-md:justify-self-end">
                <StatusBadge icon={status.Icon} tone={status.tone}>
                  {status.label}
                </StatusBadge>
              </TableCell>
              <TableCell
                className={`max-md:order-5 ${facility.occupied_by ? '' : 'max-md:hidden'}`}
              >
                <OccupiedBy facility={facility} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
