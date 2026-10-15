'use client';

import { TriangleAlert } from 'lucide-react';

import type { components } from '@/lib/api/schema';
import { isFarmEmployee } from '@/lib/farm-scope';
import { isFieldPermission } from '@/lib/permissions';

type SessionUser = components['schemas']['SessionUser'];

// Un empleado de campo sin finca asignada no ve ni registra nada: las listas le salen vacías sin
// que se entienda por qué. Se lo dice arriba de cualquier pantalla, y a quién pedírsela. Al
// Administrador de la asociación nunca: no es de un productor y no lleva fincas.
export function NoFarmNotice({ user }: { user: SessionUser }) {
  const waiting =
    isFarmEmployee(user) &&
    user.farms.length === 0 &&
    user.permissions.some(isFieldPermission);
  if (!waiting) return null;
  return (
    <div className="px-4 pt-6 sm:px-8">
      <p
        className="mx-auto flex w-full max-w-7xl items-start gap-3 rounded-lg bg-warn-bg p-4 font-bold text-warn"
        role="status"
      >
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        Tu cuenta no tiene una finca asignada, así que no ves ni registras nada
        de campo. Pídele al productor que te asigne una.
      </p>
    </div>
  );
}
