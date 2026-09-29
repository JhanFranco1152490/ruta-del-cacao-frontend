'use client';
import { useEffect, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/errors';
import {
  useProducerOptions,
  type ProducerSummary,
} from '@/lib/api/producer-options';

const SEARCH_DELAY_MS = 300;

// Con qué productor trabaja la asociación en esta pantalla: sin elegir uno, solo puede crear
// cuentas de Administrador; con uno que haya autorizado el acceso, también sus empleados.
export function ProducerFilter({
  producer,
  selected,
  onSelect,
  onClear,
}: {
  producer: string | undefined;
  selected: UseQueryResult<ProducerSummary>;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  if (!producer) return <ProducerPicker onSelect={onSelect} />;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm break-words">
          <span className="font-bold">Productor: </span>
          {selected.data
            ? `${selected.data.first_name} ${selected.data.last_name} · ${selected.data.member_code}`
            : selected.isError
              ? getErrorMessage(
                  selected.error,
                  'No fue posible cargar el productor.',
                )
              : 'Cargando productor…'}
        </span>
        <Button variant="outline" onClick={onClear}>
          Quitar filtro de productor
        </Button>
      </div>
      {selected.data?.association_access === false && (
        <p role="alert" className="text-sm font-bold text-err">
          Este productor no ha autorizado el acceso de la asociación: no puedes
          ver ni crear las cuentas de sus empleados.
        </p>
      )}
    </div>
  );
}

function ProducerPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);
  const options = useProducerOptions(search);
  const results = options.data?.results ?? [];
  const more = (options.data?.count ?? 0) - results.length;
  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Buscar productor"
          placeholder="Nombre, documento o código de socio"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <SelectField
          label="Productor"
          value=""
          disabled={options.isPending || options.isError}
          hint={
            more > 0
              ? `Se muestran ${results.length} productores; escribe para encontrar otros.`
              : undefined
          }
          onChange={(event) => {
            if (event.target.value) onSelect(event.target.value);
          }}
        >
          <option value="">
            {options.isPending
              ? 'Cargando productores…'
              : results.length
                ? 'Todos los productores'
                : 'Ningún productor coincide'}
          </option>
          {results.map((option) => (
            <option key={option.id} value={option.id}>
              {option.first_name} {option.last_name} · {option.member_code}
            </option>
          ))}
        </SelectField>
      </div>
      {options.isError ? (
        <p role="alert" className="text-sm font-bold text-err">
          {getErrorMessage(
            options.error,
            'No fue posible cargar los productores.',
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Elige un productor para ver y crear las cuentas de sus empleados. Solo
          puedes gestionarlas si ese productor autorizó el acceso de la
          asociación.
        </p>
      )}
    </div>
  );
}
