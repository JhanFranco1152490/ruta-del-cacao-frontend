'use client';

import { ActionsMenu } from '@/components/actions-menu';
import { MenuItem } from '@/components/ui/menu';

import type { FacilityAction, FacilityActionKind } from '../facility-actions';
import { FACILITY_ACTION_INFO } from './facility-action-info';

// El menú «⋯» de una fila en escritorio. Sin conexión las acciones se ven deshabilitadas, no
// ocultas: así se entiende que vuelven con la señal.
export function FacilityRowMenu({
  name,
  actions,
  offline,
  onAction,
}: {
  name: string;
  actions: readonly FacilityAction[];
  offline: boolean;
  onAction: (kind: FacilityActionKind) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <ActionsMenu label={`Más acciones de ${name}`}>
      {actions.map(({ kind, disabledReason }) => {
        const { label, Icon, destructive } = FACILITY_ACTION_INFO[kind];
        return (
          <MenuItem
            className={destructive ? 'text-destructive' : undefined}
            disabled={Boolean(disabledReason) || offline}
            key={kind}
            onClick={() => onAction(kind)}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="flex flex-col">
              {label}
              {disabledReason && (
                <span className="text-xs font-normal">{disabledReason}</span>
              )}
            </span>
          </MenuItem>
        );
      })}
    </ActionsMenu>
  );
}
