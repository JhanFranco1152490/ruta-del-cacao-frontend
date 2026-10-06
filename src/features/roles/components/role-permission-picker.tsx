'use client';
import { useId } from 'react';
import { CheckboxField } from '@/components/checkbox-field';
import type { PermissionItem } from '../api';
import { groupPermissionsByArea } from '../permission-areas';
import { requiredBy, withRequirements } from '../schemas';

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
  const groups = groupPermissionsByArea(catalog);
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
      {groups.map(({ area, label, items }) => (
        <fieldset key={area} className="rounded-md border border-border p-3">
          <legend className="px-1 font-bold">{label}</legend>
          {items.map((item) => {
            const ungrantable = !item.grantable || !item.delegable;
            const dependents = requiredBy(item.code, value, catalog);
            return (
              <CheckboxField
                key={item.code}
                label={item.name}
                checked={value.includes(item.code)}
                disabled={disabled || ungrantable || dependents.length > 0}
                hint={
                  ungrantable
                    ? 'No puedes conceder este permiso.'
                    : dependents.length
                      ? `Se incluye porque lo necesita: ${dependents.map((p) => p.name).join(', ')}.`
                      : undefined
                }
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? withRequirements([...value, item.code], catalog)
                      : value.filter((code) => code !== item.code),
                  )
                }
              />
            );
          })}
        </fieldset>
      ))}
    </fieldset>
  );
}
