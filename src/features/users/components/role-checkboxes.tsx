'use client';
import { SlidersHorizontal } from 'lucide-react';
import { CheckboxField } from '@/components/checkbox-field';
import { Button } from '@/components/ui/button';

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
  canCustomize,
  onCustomize,
}: {
  legend: string;
  roles: RoleOption[];
  locked?: RoleOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled: boolean;
  // "Personalizar permisos": parte de este rol para crear uno propio con menos permisos.
  canCustomize?: (role: RoleOption) => boolean;
  onCustomize?: (role: RoleOption) => void;
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
          <div key={role.id}>
            <CheckboxField
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
            {onCustomize && canCustomize?.(role) && (
              <Button
                aria-label={`Personalizar permisos de ${role.name}`}
                className="ml-8"
                disabled={disabled}
                onClick={() => onCustomize(role)}
                size="sm"
                type="button"
                variant="link"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Personalizar permisos
              </Button>
            )}
          </div>
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
