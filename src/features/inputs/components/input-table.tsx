import { cn } from 'cn';

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

import { inputTypeLabel, inputUnitLabel } from '../input-options';
import type { InputRow } from '../input-rows';
import {
  formatPackage,
  formatStock,
  inputPackageOf,
  isNegativeStock,
} from '@/lib/format/input-quantity';
import {
  type InputActionKind,
  type InputPermissions,
  InputRowActions,
} from './input-row-actions';
import type { AgriculturalInput } from '../api';

// Cómo están las existencias de la finca elegida: listas, cargando o sin datos (sin conexión y
// sin copia de esa finca).
export type StockState = 'ready' | 'loading' | 'unavailable';

const producerLabel = ({ producer }: AgriculturalInput) =>
  `${producer.first_name} ${producer.last_name} · ${producer.member_code}`;

function StockValue({ row, state }: { row: InputRow; state: StockState }) {
  if (state === 'loading') return <span>Cargando…</span>;
  if (state === 'unavailable') {
    return (
      <span className="text-muted-foreground">Sin datos de esta finca</span>
    );
  }
  const { input, quantity } = row;
  return (
    <span className="flex flex-col items-start gap-1">
      <span>{formatStock(quantity, input.unit, inputPackageOf(input))}</span>
      {isNegativeStock(quantity) && (
        <StatusBadge tone="warn">Faltan entradas por registrar</StatusBadge>
      )}
    </span>
  );
}

export function InputTable({
  rows,
  farm,
  stockFarms,
  stockState,
  showProducer,
  permissions,
  actionsDisabled,
  onAction,
}: {
  rows: readonly InputRow[];
  // La finca elegida; sin ella las existencias son el total de todas.
  farm: string | null;
  // Si se puede registrar una entrada o un conteo: hay una finca elegida o fincas entre las que elegir.
  stockFarms: boolean;
  stockState: StockState;
  showProducer: boolean;
  permissions: InputPermissions;
  actionsDisabled: boolean;
  onAction: (kind: InputActionKind, input: AgriculturalInput) => void;
}) {
  return (
    <Table aria-label="Insumos" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Unidad</TableHead>
          <TableHead>Presentación</TableHead>
          <TableHead>Existencias</TableHead>
          {showProducer && <TableHead>Productor</TableHead>}
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const { input } = row;
          const inputPackage = inputPackageOf(input);
          return (
            <TableRow key={input.id}>
              <TableCell
                className={cn(
                  'max-w-64 min-w-0 font-bold break-words whitespace-normal max-md:order-1 max-md:col-span-1! max-md:text-base!',
                  input.is_active
                    ? 'max-md:text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {input.name}
              </TableCell>
              <TableCell className="max-md:order-3 max-md:text-muted-foreground">
                {inputTypeLabel(input.input_type)}
                {/* En celular tipo, unidad y presentación van en una sola línea bajo el nombre. */}
                <span aria-hidden="true" className="md:hidden">
                  {' · '}
                  {inputUnitLabel(input.unit)}
                  {inputPackage &&
                    ` · ${formatPackage(inputPackage.package_type, inputPackage.package_size, input.unit)}`}
                </span>
              </TableCell>
              <TableCell className="max-md:hidden">
                {inputUnitLabel(input.unit)}
              </TableCell>
              <TableCell className="max-md:hidden">
                {inputPackage
                  ? formatPackage(
                      inputPackage.package_type,
                      inputPackage.package_size,
                      input.unit,
                    )
                  : '—'}
              </TableCell>
              <TableCell className="whitespace-normal max-md:order-4 max-md:font-bold">
                <StockValue row={row} state={stockState} />
              </TableCell>
              {showProducer && (
                <TableCell className="max-w-64 break-words whitespace-normal max-md:order-5 max-md:text-muted-foreground">
                  {producerLabel(input)}
                </TableCell>
              )}
              <TableCell className="max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
                <StatusBadge tone={input.is_active ? 'ok' : 'warn'}>
                  {input.is_active ? 'Activo' : 'Inactivo'}
                </StatusBadge>
              </TableCell>
              <TableCell className="max-md:order-6">
                <InputRowActions
                  disabled={actionsDisabled}
                  farm={farm}
                  stockFarms={stockFarms}
                  input={input}
                  onAction={onAction}
                  permissions={permissions}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
