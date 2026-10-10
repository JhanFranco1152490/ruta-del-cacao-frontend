import { STACKED_TABLE_CLASS } from '@/components/stacked-table-class';
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
} from '../stock-format';
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

function StockValue({
  row,
  state,
  farm,
  needsProducer,
}: {
  row: InputRow;
  state: StockState;
  farm: string | null;
  needsProducer: boolean;
}) {
  // La columna siempre está: sin finca elegida dice qué falta, en vez de esconder el inventario.
  if (!farm) {
    return (
      <span className="text-muted-foreground">
        {needsProducer ? 'Elige un productor y una finca' : 'Elige una finca'}
      </span>
    );
  }
  if (state === 'loading') return <span>Cargando…</span>;
  if (state === 'unavailable') {
    return (
      <span className="text-muted-foreground">Sin datos de esta finca</span>
    );
  }
  const { input, quantity } = row;
  return (
    <span className="flex flex-col items-end gap-1 md:items-start">
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
  stockState,
  showProducer,
  permissions,
  actionsDisabled,
  onAction,
}: {
  rows: readonly InputRow[];
  // Las existencias son de la finca elegida; sin ella la columna pide elegirla.
  farm: string | null;
  stockState: StockState;
  showProducer: boolean;
  permissions: InputPermissions;
  actionsDisabled: boolean;
  onAction: (kind: InputActionKind, input: AgriculturalInput) => void;
}) {
  return (
    <Table aria-label="Insumos" className={STACKED_TABLE_CLASS}>
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
                className={
                  input.is_active
                    ? 'max-w-64 font-bold break-words whitespace-normal'
                    : 'max-w-64 font-bold break-words whitespace-normal text-muted-foreground'
                }
                data-label="Nombre"
              >
                {input.name}
              </TableCell>
              <TableCell data-label="Tipo">
                {inputTypeLabel(input.input_type)}
              </TableCell>
              <TableCell data-label="Unidad">
                {inputUnitLabel(input.unit)}
              </TableCell>
              <TableCell data-label="Presentación">
                {inputPackage
                  ? formatPackage(
                      inputPackage.package_type,
                      inputPackage.package_size,
                      input.unit,
                    )
                  : '—'}
              </TableCell>
              <TableCell className="whitespace-normal" data-label="Existencias">
                <StockValue
                  farm={farm}
                  needsProducer={showProducer}
                  row={row}
                  state={stockState}
                />
              </TableCell>
              {showProducer && (
                <TableCell
                  className="max-w-64 break-words whitespace-normal"
                  data-label="Productor"
                >
                  {producerLabel(input)}
                </TableCell>
              )}
              <TableCell data-label="Estado">
                <StatusBadge tone={input.is_active ? 'ok' : 'warn'}>
                  {input.is_active ? 'Activo' : 'Inactivo'}
                </StatusBadge>
              </TableCell>
              <TableCell>
                <InputRowActions
                  disabled={actionsDisabled}
                  farm={farm}
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
