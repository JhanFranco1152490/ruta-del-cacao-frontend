'use client';

import { FilterRow } from '@/components/filter-row';
import { SearchSelect } from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import type { WarehouseView } from '@/lib/paths/warehouse';
import { Plus } from 'lucide-react';

import type { Grade } from '../api';
import { GRADE_LABELS } from '@/lib/stock-quantity';
import { EXIT_REASON_LABELS } from '../exit-reasons';
import { OFFLINE_WAREHOUSE_REASON } from '../warehouse-actions';
import { STOCK_ORDER_OPTIONS } from '../stock-order-options';
import type { StockOrdering } from '../use-warehouse-filters';
import type { WarehouseScreenState } from '../use-warehouse-screen';

const VIEW_LABELS: Record<WarehouseView, string> = {
  existencias: 'Existencias',
  'por-ingresar': 'Por ingresar',
  salidas: 'Salidas',
  bodegas: 'Bodegas',
};

// Las pestañas, el buscador por código y los filtros de la pestaña, en una fila. En celular las
// pestañas pasan debajo y los filtros quedan tras «Filtros», con el orden de las existencias (en
// escritorio se ordena desde la cabecera de la tabla).
export function WarehouseFiltersBar({
  screen,
  onCreate,
}: {
  screen: WarehouseScreenState;
  // Registrar una bodega: se ofrece en la fila de filtros de la pestaña Bodegas.
  onCreate: () => void;
}) {
  const { filters, view } = screen;
  const stock = filters.stockFilters;
  const onStock = view === 'existencias';
  const onExits = view === 'salidas';
  const exitInputs = filters.exitInputs;
  const activeCount = onStock
    ? [stock.farm, stock.warehouse, stock.grade, stock.location].filter(Boolean)
        .length
    : onExits
      ? [
          stock.farm,
          stock.warehouse,
          stock.grade,
          exitInputs.reason,
          exitInputs.state,
          exitInputs.from || exitInputs.to,
        ].filter(Boolean).length
      : stock.farm
        ? 1
        : 0;
  return (
    <FilterRow
      activeCount={activeCount}
      compact
      leading={
        <SegmentedControl<WarehouseView>
          compact
          fullWidth
          label="Vista de bodega"
          onChange={(next) => void filters.setView(next)}
          options={screen.views.map((value) => ({
            value,
            label: VIEW_LABELS[value],
          }))}
          value={view}
        />
      }
      search={
        view !== 'bodegas' && (
          <TextField
            className="h-10 text-sm"
            hideLabel
            label="Buscar por código"
            onChange={(event) => filters.setSearchInput(event.target.value)}
            placeholder="Código del lote"
            type="search"
            value={filters.searchInput}
            wrapperClassName="min-w-0 flex-1 sm:w-64 sm:flex-none"
          />
        )
      }
      trailing={
        <>
          {filters.hasFilters && (
            <Button
              className="h-10"
              onClick={() => void filters.clear()}
              size="office"
              variant="ghost"
            >
              Limpiar filtros
            </Button>
          )}
          {view === 'bodegas' && screen.can.manage && (
            <Button
              className="h-10 max-sm:order-first max-sm:w-full sm:ml-auto"
              disabled={screen.offline}
              onClick={onCreate}
              size="office"
              title={screen.offline ? OFFLINE_WAREHOUSE_REASON : undefined}
            >
              <Plus aria-hidden="true" className="size-4" />
              Nueva bodega
            </Button>
          )}
        </>
      }
    >
      {screen.farmOptions.length > 1 && (
        <SearchSelect
          allLabel="Todas las fincas"
          className="w-full sm:w-56"
          compact
          label="Finca"
          onChange={(option) => void filters.setFarm(option?.id ?? null)}
          options={screen.farmOptions}
          value={screen.farm.choice}
        />
      )}
      {onStock && <StockFilters screen={screen} />}
      {onExits && <ExitFilters screen={screen} />}
    </FilterRow>
  );
}

function StockFilters({ screen }: { screen: WarehouseScreenState }) {
  const { filters } = screen;
  const stock = filters.stockFilters;
  return (
    <>
      <SelectField
        hideLabel
        label="Bodega"
        onChange={(event) =>
          void filters.setWarehouse(event.target.value || null)
        }
        value={stock.warehouse ?? ''}
        wrapperClassName="w-full sm:w-52"
      >
        <option value="">Todas las bodegas</option>
        {screen.warehouseOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Calibre"
        onChange={(event) =>
          void filters.setGrade((event.target.value || null) as Grade | null)
        }
        value={stock.grade ?? ''}
        wrapperClassName="w-full sm:w-44"
      >
        <option value="">Todos los calibres</option>
        {(['g1', 'g2'] as const).map((grade) => (
          <option key={grade} value={grade}>
            {GRADE_LABELS[grade]}
          </option>
        ))}
      </SelectField>
      <TextField
        className="h-10 text-sm"
        hideLabel
        label="Estante o zona dentro de la bodega"
        onChange={(event) => filters.setLocationInput(event.target.value)}
        placeholder="Estante o zona"
        type="search"
        value={filters.locationInput}
        wrapperClassName="w-full sm:w-40"
      />
      <SelectField
        hideLabel
        label="Ordenar existencias"
        onChange={(event) =>
          void filters.setOrdering(event.target.value as StockOrdering)
        }
        value={screen.ordering}
        wrapperClassName="w-full md:hidden"
      >
        {STOCK_ORDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
    </>
  );
}

const STATE_LABELS = { active: 'Vigentes', voided: 'Anuladas' } as const;

// Solo en Salidas: bodega, calibre, motivo, estado y el periodo de la fecha de la salida, con los
// días incluidos.
function ExitFilters({ screen }: { screen: WarehouseScreenState }) {
  const { filters } = screen;
  const { reason, state, from, to } = filters.exitInputs;
  return (
    <>
      <SelectField
        hideLabel
        label="Bodega"
        onChange={(event) =>
          void filters.setWarehouse(event.target.value || null)
        }
        value={filters.exitFilters.warehouse ?? ''}
        wrapperClassName="w-full sm:w-52"
      >
        <option value="">Todas las bodegas</option>
        {screen.warehouseOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Calibre"
        onChange={(event) =>
          void filters.setGrade((event.target.value || null) as Grade | null)
        }
        value={filters.exitFilters.grade ?? ''}
        wrapperClassName="w-full sm:w-44"
      >
        <option value="">Todos los calibres</option>
        {(['g1', 'g2'] as const).map((grade) => (
          <option key={grade} value={grade}>
            {GRADE_LABELS[grade]}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Motivo"
        onChange={(event) =>
          void filters.setReason((event.target.value || null) as typeof reason)
        }
        value={reason ?? ''}
        wrapperClassName="w-full sm:w-44"
      >
        <option value="">Todos los motivos</option>
        {Object.entries(EXIT_REASON_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Estado"
        onChange={(event) =>
          void filters.setState((event.target.value || null) as typeof state)
        }
        value={state ?? ''}
        wrapperClassName="w-full sm:w-40"
      >
        <option value="">Todos los estados</option>
        {Object.entries(STATE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="flex w-full items-start gap-2 sm:w-auto">
        <TextField
          className="h-10 text-sm"
          error={filters.periodError ?? undefined}
          hideLabel
          label="Salidas desde"
          onChange={(event) => void filters.setFrom(event.target.value)}
          title="Salidas desde"
          type="date"
          value={from ?? ''}
          wrapperClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
        <span aria-hidden="true" className="pt-2">
          –
        </span>
        <TextField
          className="h-10 text-sm"
          hideLabel
          label="Salidas hasta"
          onChange={(event) => void filters.setTo(event.target.value)}
          title="Salidas hasta"
          type="date"
          value={to ?? ''}
          wrapperClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
      </div>
    </>
  );
}
