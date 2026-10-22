'use client';

import { useId, useState } from 'react';

import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type AccountKind = 'administrator' | 'employee';

// Una opción del tipo de cuenta como tarjeta: se toca en cualquier parte y dice qué es.
function AccountKindOption({
  name,
  label,
  hint,
  checked,
  disabled,
  onSelect,
}: {
  name: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const labelId = `${name}-${label.replace(/\s+/g, '-')}`;
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-border p-3 has-checked:border-selva has-checked:bg-surface-alt has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        aria-describedby={`${labelId}-hint`}
        aria-labelledby={labelId}
        checked={checked}
        className="mt-1 size-5 accent-selva"
        disabled={disabled}
        name={name}
        onChange={onSelect}
        type="radio"
      />
      <span>
        <span className="block font-bold" id={labelId}>
          {label}
        </span>
        <span
          className="block text-sm text-muted-foreground"
          id={`${labelId}-hint`}
        >
          {hint}
        </span>
      </span>
    </label>
  );
}

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
      <fieldset className="space-y-3">
        <legend className="font-bold text-selva">¿Qué tipo de cuenta?</legend>
        <AccountKindOption
          checked={kind === 'administrator'}
          hint="Una cuenta con acceso de administración de la asociación."
          label="Administrador de la asociación"
          name={group}
          onSelect={() => setKind('administrator')}
        />
        <AccountKindOption
          checked={kind === 'employee'}
          disabled={!canPickProducer}
          hint="Trabaja para un productor, con los roles y las fincas que le asignes."
          label="Empleado de un productor"
          name={group}
          onSelect={() => setKind('employee')}
        />
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
        className="w-full sm:w-auto"
        size="office"
        disabled={!canContinue}
        onClick={() => onChoose(kind === 'employee' ? producer : undefined)}
      >
        Continuar
      </Button>
    </div>
  );
}
