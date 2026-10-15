'use client';

import { cn } from 'cn';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { useIsDesktop } from '@/hooks/use-is-desktop';

import type { RolePermissionGroup } from '../permission-areas';

// Con pocos permisos se ven todos de una vez; con muchos, en celular solo abre la primera área y
// el resto se despliega al tocarla, para no recorrer una lista de treinta líneas.
const SHOW_ALL_UP_TO = 12;

// Los permisos de un rol por área, cada una plegable y con su cuenta. Solo lectura: lo que se
// concede se edita en el formulario del rol.
export function RolePermissionAreas({
  groups,
}: {
  groups: readonly RolePermissionGroup[];
}) {
  const isDesktop = useIsDesktop();
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-3">
      {groups.map((group, index) => {
        const open =
          chosen[group.area] ??
          (isDesktop || total <= SHOW_ALL_UP_TO || index === 0);
        const listId = `role-area-${group.area}`;
        return (
          <section
            className="overflow-hidden rounded-[var(--radius-card)] border border-border"
            key={group.area}
          >
            <h4>
              <button
                aria-controls={listId}
                aria-expanded={open}
                className="flex min-h-11 w-full items-center gap-2 bg-surface-alt px-3 text-left font-bold text-selva"
                onClick={() =>
                  setChosen((value) => ({ ...value, [group.area]: !open }))
                }
                type="button"
              >
                {group.label}
                <span className="ml-auto rounded-full bg-ok-bg px-2 text-xs text-ok">
                  {group.items.length}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 transition-transform',
                    open && 'rotate-180',
                  )}
                />
              </button>
            </h4>
            <ul
              className={cn('divide-y divide-border', !open && 'hidden')}
              id={listId}
            >
              {group.items.map((item) => (
                <li
                  className="flex items-start gap-2 px-3 py-2 text-sm break-words"
                  key={item.code}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-ok"
                  />
                  {item.name}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
