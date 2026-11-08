'use client';

import { ActionsMenu } from '@/components/actions-menu';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';

import type { BuyerAction, BuyerActionKind } from '../buyer-actions';
import { BUYER_ACTION_INFO } from './buyer-action-info';

// Con dos acciones, dos botones; desde la tercera, el menú «⋯». Una acción deshabilitada se ve y
// dice por qué (sin conexión, o un comprador con ventas que no se puede eliminar).
export function BuyerRowActions({
  name,
  actions,
  inMenu,
  onAction,
}: {
  name: string;
  actions: readonly BuyerAction[];
  inMenu: boolean;
  onAction: (kind: BuyerActionKind) => void;
}) {
  if (actions.length === 0) return null;
  if (!inMenu) {
    return (
      <div className="flex justify-end gap-2">
        {actions.map(({ kind, disabledReason }) => {
          const { label, Icon } = BUYER_ACTION_INFO[kind];
          return (
            <Button
              aria-label={`${label} ${name}`}
              disabled={Boolean(disabledReason)}
              key={kind}
              onClick={() => onAction(kind)}
              size="office"
              title={disabledReason}
              variant="action"
            >
              <Icon aria-hidden="true" /> {label}
            </Button>
          );
        })}
      </div>
    );
  }
  return (
    <ActionsMenu label={`Más acciones de ${name}`}>
      {actions.map(({ kind, disabledReason }) => {
        const { label, Icon, destructive } = BUYER_ACTION_INFO[kind];
        return (
          <MenuItem
            className={destructive ? 'text-destructive' : undefined}
            disabled={Boolean(disabledReason)}
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
