'use client';
import { TriangleAlert } from 'lucide-react';
import { CheckboxField } from '@/components/checkbox-field';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import {
  effectiveScope,
  type AccountScope,
  type RequiredScope,
} from '@/lib/farm-scope';

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

// El alcance de un empleado: las fincas en las que trabaja (una o varias, o una sola si su rol lo
// pide) o todas, también las que se registren después. Lo que se ofrece sale de lo que piden sus
// roles y de lo que alcanza quien lo da: nadie da más alcance del que tiene. Ofrece las fincas
// activas del productor y conserva las que la cuenta ya tiene aunque se hayan desactivado.
export function AccountScopeField({
  userId,
  producer,
  required,
  current = [],
  currentAll = false,
  value,
  onChange,
  error,
  disabled,
}: {
  userId: string;
  // Solo la cuenta técnica lo indica: para el Productor son sus propias fincas.
  producer?: string;
  // Lo que piden los roles de la cuenta.
  required: RequiredScope;
  current?: readonly FarmRef[];
  // La cuenta ya trabaja en todas las fincas.
  currentAll?: boolean;
  value: AccountScope;
  onChange: (value: AccountScope) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { data: user } = useSession();
  // Solo quien alcanza todas las fincas da «todas».
  const canGiveAll = Boolean(user?.all_farms);
  const farms = useFarmOptions(userId, producer);
  const scope = effectiveScope(required, value);
  const active = (farms.data?.data.options ?? []).filter(
    (farm) => farm.isActive || current.some(({ id }) => id === farm.id),
  );
  const listed: FarmRef[] = [
    ...current.filter((farm) => !active.some(({ id }) => id === farm.id)),
    ...active,
  ];
  // Las que tenía y se le quitan; agregarle fincas no tiene consecuencias que advertir. Desde
  // «todas», se le quitan las que no queden marcadas.
  const left = scope.all_farms
    ? []
    : (currentAll ? listed : current).filter(
        ({ id }) => !scope.farm_ids.includes(id),
      );
  const offerAll = required !== 'one' && (required === 'all' || canGiveAll);
  const offerSome = required !== 'all';
  const single = required === 'one';
  const hint = farms.isError
    ? 'No fue posible cargar las fincas. Revisa tu conexión.'
    : farms.isSuccess && !listed.length
      ? 'Registra primero una finca para asignársela.'
      : single
        ? 'Sus roles piden una sola finca: solo verá y registrará lo de esa.'
        : 'Solo verá y registrará lo de las fincas que marques.';

  return (
    <>
      <fieldset
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'account-scope-error' : 'account-scope-hint'}
        disabled={disabled}
      >
        <legend className="mb-2 font-bold text-selva">
          {single
            ? 'Finca en la que trabaja'
            : 'Alcance: fincas en las que trabaja'}
        </legend>
        {required === 'conflict' ? (
          <p className="text-sm text-muted-foreground">
            Resuelve primero el choque entre los roles.
          </p>
        ) : required === 'all' ? (
          <p className="text-sm font-bold text-foreground">
            Sus roles trabajan en todas las fincas, también en las que se
            registren después.
          </p>
        ) : (
          <>
            {offerAll && offerSome && (
              <div role="radiogroup" aria-label="Alcance" className="mb-1">
                <ScopeRadio
                  checked={scope.all_farms}
                  label="Todas las fincas, también las que se registren después"
                  onSelect={() => onChange({ all_farms: true, farm_ids: [] })}
                />
                <ScopeRadio
                  checked={!scope.all_farms}
                  label="Fincas específicas"
                  onSelect={() =>
                    onChange({ all_farms: false, farm_ids: scope.farm_ids })
                  }
                />
              </div>
            )}
            {!scope.all_farms && (
              <>
                {farms.isPending && <p role="status">Cargando fincas…</p>}
                {listed.map((farm) =>
                  single ? (
                    <ScopeRadio
                      checked={scope.farm_ids.includes(farm.id)}
                      key={farm.id}
                      label={farm.name}
                      name="account-farm"
                      onSelect={() =>
                        onChange({ all_farms: false, farm_ids: [farm.id] })
                      }
                    />
                  ) : (
                    <CheckboxField
                      key={farm.id}
                      label={farm.name}
                      checked={scope.farm_ids.includes(farm.id)}
                      onCheckedChange={(checked) =>
                        onChange({
                          all_farms: false,
                          farm_ids: checked
                            ? [...scope.farm_ids, farm.id]
                            : scope.farm_ids.filter((id) => id !== farm.id),
                        })
                      }
                    />
                  ),
                )}
              </>
            )}
          </>
        )}
        <p id="account-scope-hint" className="text-sm text-muted-foreground">
          {hint}
        </p>
      </fieldset>
      {left.length > 0 && <LeftFarmsNotice left={left} />}
      {error && (
        <p id="account-scope-error" role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
    </>
  );
}

function ScopeRadio({
  checked,
  label,
  onSelect,
  name = 'account-scope',
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
  name?: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input
        checked={checked}
        className="size-5 accent-selva"
        name={name}
        onChange={onSelect}
        type="radio"
      />
      {label}
    </label>
  );
}
