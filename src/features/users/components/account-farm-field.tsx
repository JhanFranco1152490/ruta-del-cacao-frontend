'use client';
import { TriangleAlert } from 'lucide-react';
import { CheckboxField } from '@/components/checkbox-field';
import { useFarmOptions } from '@/lib/api/farm-options';

type FarmRef = { id: string; name: string };

const listNames = (names: readonly string[]) =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

// Qué pasa al quitarle a alguien fincas que ya tenía, para que se sepa antes de guardar: sus labores
// por hacer ahí lo impiden hasta reasignarlas, y lo que tenga sin sincronizar de esas fincas se
// rechazará en su dispositivo.
function LeftFarmsNotice({ left }: { left: readonly FarmRef[] }) {
  const one = left.length === 1;
  const those = one ? 'esa finca' : 'esas fincas';
  return (
    <div
      role="status"
      className="mt-3 flex gap-3 rounded-lg bg-warn-bg p-4 text-sm text-warn"
    >
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-bold">
          Le quitas {listNames(left.map(({ name }) => name))}.
        </p>
        <p>
          Si tiene actividades programadas o retrasadas en {those}, no se
          guardará hasta que se las reasignes o se registren como realizadas.
          Las vencidas se quedan a su nombre.
        </p>
        <p>
          Lo que tenga sin sincronizar de {those} en su dispositivo se
          rechazará, y tendrá que descartarlo.
        </p>
      </div>
    </div>
  );
}

// Las fincas en las que trabaja un empleado (puede atender varias vecinas): solo verá y
// registrará lo de ellas. Ofrece las fincas activas del productor y conserva las que la cuenta
// ya tiene aunque se hayan desactivado.
export function AccountFarmsField({
  userId,
  producer,
  required,
  current = [],
  value,
  onChange,
  error,
  disabled,
}: {
  userId: string;
  // Solo la cuenta técnica lo indica: para el Productor son sus propias fincas.
  producer?: string;
  required: boolean;
  current?: readonly FarmRef[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const farms = useFarmOptions(userId, producer);
  const active = (farms.data?.data.options ?? []).filter(
    (farm) => farm.isActive || current.some(({ id }) => id === farm.id),
  );
  const listed: FarmRef[] = [
    ...current.filter((farm) => !active.some(({ id }) => id === farm.id)),
    ...active,
  ];
  // Las que tenía y se le quitan; agregarle fincas no tiene consecuencias que advertir.
  const left = current.filter(({ id }) => !value.includes(id));
  const hint = farms.isError
    ? 'No fue posible cargar las fincas. Revisa tu conexión.'
    : farms.isSuccess && !listed.length
      ? 'Registra primero una finca para asignársela.'
      : required
        ? 'Solo verá y registrará lo de las fincas que marques.'
        : 'Sus roles no trabajan en campo: puede quedar sin finca.';
  return (
    <>
      <fieldset
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'account-farms-error' : 'account-farms-hint'}
      >
        <legend className="mb-2 font-bold text-selva">
          {required ? 'Fincas en las que trabaja' : 'Fincas (opcional)'}
        </legend>
        {farms.isPending && <p role="status">Cargando fincas…</p>}
        {listed.map((farm) => (
          <CheckboxField
            key={farm.id}
            label={farm.name}
            checked={value.includes(farm.id)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, farm.id]
                  : value.filter((id) => id !== farm.id),
              )
            }
          />
        ))}
        <p id="account-farms-hint" className="text-sm text-muted-foreground">
          {hint}
        </p>
      </fieldset>
      {left.length > 0 && <LeftFarmsNotice left={left} />}
      {error && (
        <p id="account-farms-error" role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
    </>
  );
}
