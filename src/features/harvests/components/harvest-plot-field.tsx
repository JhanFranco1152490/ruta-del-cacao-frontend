'use client';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SearchSelect } from '@/components/search-select';

import type { HarvestPlotChoice } from '../harvest-plots';

// La parcela de la cosecha: la lista completa, agrupada por finca y con buscador por código o
// nombre. Cada una dice su área y sus variedades; las que no tienen siembras se ven pero no se
// eligen, con el motivo.
export function HarvestPlotField({
  plots,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  truncated,
}: {
  plots: readonly HarvestPlotChoice[];
  value: string;
  onChange: (plotId: string) => void;
  onBlur: () => void;
  error?: string;
  disabled: boolean;
  truncated: boolean;
}) {
  const chosen = plots.find(({ id }) => id === value) ?? null;
  return (
    <div className="space-y-2">
      <SearchSelect
        disabled={disabled}
        emptyMessage="Ninguna parcela coincide con la búsqueda."
        error={error}
        hint={
          truncated
            ? 'Se muestran las primeras 100 parcelas: escribe el código o el nombre para encontrar otra.'
            : 'Solo parcelas activas de las fincas en las que trabajas.'
        }
        inputClassName={CAPTURE_FIELD_CLASS}
        label="Parcela de origen"
        onBlur={onBlur}
        onChange={(option) => onChange(option?.id ?? '')}
        options={plots}
        placeholder="Busca por código o nombre"
        value={chosen}
      />
      {chosen?.characterizationPending && (
        <p className="text-sm font-bold text-warn" role="status">
          La ficha de esta parcela tiene cambios sin enviar: estas son las
          variedades de la última copia.
        </p>
      )}
    </div>
  );
}
