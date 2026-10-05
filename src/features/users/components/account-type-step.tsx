'use client';

import { useId, useState } from 'react';

import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type AccountKind = 'administrator' | 'employee';

// Primer paso de "Crear cuenta" para la asociación: qué tipo de cuenta y, si es de un empleado,
// de qué productor. Con un empleado no deja continuar hasta que haya un productor elegido.
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
  const canContinue = kind === 'administrator' || Boolean(producer);
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
        />
      )}
      <Button
        size="office"
        disabled={!canContinue}
        onClick={() => onChoose(kind === 'employee' ? producer : undefined)}
      >
        Continuar
      </Button>
    </div>
  );
}
