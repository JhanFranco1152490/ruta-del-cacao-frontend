'use client';

import { useId, useState } from 'react';

import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type AccountKind = 'administrator' | 'employee';

const DENIED =
  'Este productor no autorizó el acceso de la asociación: no se le pueden crear cuentas de empleados.';

// Primer paso de "Crear cuenta" para la asociación: qué tipo de cuenta y, si es de un empleado,
// de qué productor. Solo deja seguir con un productor que autorizó el acceso: el backend
// rechazaría la cuenta.
export function AccountTypeStep({
  user,
  initialProducer,
  onChoose,
}: {
  user: components['schemas']['SessionUser'];
  initialProducer?: string;
  onChoose: (producer: string | undefined) => void;
}) {
  const canPickProducer = hasPermission(user, PERMISSIONS.PRODUCERS_VIEW);
  const [kind, setKind] = useState<AccountKind>(
    initialProducer && canPickProducer ? 'employee' : 'administrator',
  );
  const [producer, setProducer] = useState(initialProducer);
  const selected = useProducerSummary(
    kind === 'employee' ? producer : undefined,
  );
  const allowed =
    kind === 'administrator' || selected.data?.association_access === true;
  const group = useId();

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="font-bold text-selva">¿Qué tipo de cuenta?</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name={group}
            checked={kind === 'administrator'}
            onChange={() => setKind('administrator')}
          />
          Administrador de la asociación
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name={group}
            checked={kind === 'employee'}
            disabled={!canPickProducer}
            onChange={() => setKind('employee')}
          />
          Empleado de un productor
        </label>
        {!canPickProducer && (
          <p className="text-sm text-muted-foreground">
            Para crear empleados necesitas permiso para consultar productores.
          </p>
        )}
      </fieldset>
      {kind === 'employee' && (
        <ProducerFilter
          producer={producer}
          selected={selected}
          onSelect={setProducer}
          onClear={() => setProducer(undefined)}
          deniedMessage={DENIED}
        />
      )}
      <Button
        size="office"
        disabled={!allowed}
        onClick={() => onChoose(kind === 'employee' ? producer : undefined)}
      >
        Continuar
      </Button>
    </div>
  );
}
