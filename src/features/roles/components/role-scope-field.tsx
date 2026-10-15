'use client';

import { useSession } from '@/hooks/use-session';
import { ROLE_SCOPES, type RoleScope } from '@/lib/farm-scope';

// Qué alcance admiten las cuentas con el rol: una sola finca, una o varias, o siempre todas. El
// rol limita y la cuenta tiene el valor. «Siempre todas» solo la ofrece quien alcanza todas las
// fincas: nadie da más alcance del que tiene.
export function RoleScopeField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: RoleScope;
  onChange: (value: RoleScope) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { data: user } = useSession();
  const canGiveAll = Boolean(user?.all_farms);
  return (
    <fieldset
      aria-describedby={error ? 'role-scope-error' : undefined}
      aria-invalid={Boolean(error)}
      disabled={disabled}
    >
      <legend className="mb-2 font-bold text-selva">
        Alcance del rol: en cuántas fincas trabaja quien lo tenga
      </legend>
      {ROLE_SCOPES.map((option) => {
        const blocked = option.value === 'all' && !canGiveAll;
        return (
          <label
            className="flex items-start gap-3 py-2 has-disabled:opacity-60"
            key={option.value}
          >
            <input
              checked={value === option.value}
              className="mt-1 size-5 accent-selva"
              disabled={blocked}
              name="role-farm-scope"
              onChange={() => onChange(option.value)}
              type="radio"
            />
            <span>
              <span className="block font-bold">{option.label}</span>
              <span className="block text-sm text-muted-foreground">
                {blocked
                  ? 'Solo quien trabaja en todas las fincas puede dar este alcance.'
                  : option.hint}
              </span>
            </span>
          </label>
        );
      })}
      {error && (
        <p className="text-sm text-err" id="role-scope-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
