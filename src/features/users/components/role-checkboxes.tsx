'use client';
import { CheckboxField } from '@/components/checkbox-field';

type RoleOption = { id: string; name: string; description?: string };

// Casillas de roles con el error del grupo. Los `locked` son roles que la cuenta ya tiene pero
// quien mira no puede asignar: se muestran marcados y bloqueados, y siguen en el valor para no
// quitarlos en silencio.
export function RoleCheckboxes({
  legend,
  roles,
  locked = [],
  value,
  onChange,
  error,
  disabled,
}: {
  legend: string;
  roles: RoleOption[];
  locked?: RoleOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled: boolean;
}) {
  return (
    <>
      <fieldset
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'account-role-error' : undefined}
      >
        <legend className="mb-2 font-bold text-selva">{legend}</legend>
        {locked.map((role) => (
          <CheckboxField
            key={role.id}
            label={role.name}
            hint="No puedes asignar ni quitar este rol."
            checked
            disabled
          />
        ))}
        {roles.map((role) => (
          <CheckboxField
            key={role.id}
            label={role.name}
            hint={role.description || undefined}
            checked={value.includes(role.id)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, role.id]
                  : value.filter((id) => id !== role.id),
              )
            }
          />
        ))}
      </fieldset>
      {error && (
        <p id="account-role-error" role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
    </>
  );
}
