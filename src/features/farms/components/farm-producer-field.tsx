'use client';

import { type Control, Controller } from 'react-hook-form';

import { ProducerFilter } from '@/components/producer-filter';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { FarmFormValues } from '../schemas';

// De qué productor es la finca nueva. Solo lo elige la cuenta técnica, que no tiene un productor
// propio; para los demás la finca es del productor de la sesión y este campo no existe. El
// buscador lee los productores del servidor: sin conexión no se puede elegir otro, aunque el que
// ya venía elegido (el del encabezado) sí se puede usar.
export function FarmProducerField({
  control,
  error,
}: {
  control: Control<FarmFormValues>;
  error?: string;
}) {
  return (
    <Controller
      control={control}
      name="producer_id"
      render={({ field }) => (
        <ProducerChoice
          error={error}
          onChange={field.onChange}
          value={field.value || undefined}
        />
      )}
    />
  );
}

function ProducerChoice({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  error?: string;
}) {
  const hasConnection = useHasConnection();
  const summary = useProducerSummary(value);
  if (!hasConnection) {
    return (
      <p className="text-sm font-bold text-warn" role="status">
        {value
          ? 'Ya hay un productor elegido para esta finca. Necesitas conexión para cambiarlo.'
          : 'Necesitas conexión para elegir el productor de la finca.'}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <ProducerFilter
        label="Productor"
        onClear={() => onChange(undefined)}
        onSelect={onChange}
        placeholder="Nombre, documento o código de asociado"
        producer={value}
        selected={summary}
      />
      {error && (
        <p className="text-sm font-bold text-err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
