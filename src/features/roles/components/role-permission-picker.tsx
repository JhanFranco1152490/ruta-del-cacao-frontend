'use client';
import { useId } from 'react';
import { CheckboxField } from '@/components/checkbox-field';
import type { PermissionItem } from '../api';

export function RolePermissionPicker({
  catalog,
  value,
  onChange,
  disabled,
  error,
}: {
  catalog: PermissionItem[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const errorId = useId();
  const areas = [...new Set(catalog.map((item) => item.area))];
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="mb-3 font-bold text-selva">Permisos</legend>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-err">
          {error}
        </p>
      )}
      {!catalog.length && <p>No hay permisos disponibles.</p>}
      {areas.map((area) => (
        <fieldset key={area} className="rounded-md border border-border p-3">
          <legend className="px-1 font-bold">{area}</legend>
          {catalog
            .filter((item) => item.area === area)
            .map((item) => (
              <CheckboxField
                key={item.code}
                label={item.name}
                checked={value.includes(item.code)}
                disabled={disabled || !item.grantable || !item.delegable}
                hint={
                  !item.grantable || !item.delegable
                    ? 'No puedes conceder este permiso.'
                    : undefined
                }
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...value, item.code]
                      : value.filter((code) => code !== item.code),
                  )
                }
              />
            ))}
        </fieldset>
      ))}
    </fieldset>
  );
}
