'use client';

import { Button } from '@/components/ui/button';

import type { BuyerAction, BuyerActionKind } from '../buyer-actions';
import { BUYER_ACTION_INFO } from './buyer-action-info';

// Las acciones de un comprador en su hoja del celular: botones a lo ancho, con el motivo debajo del
// que no se puede usar.
export function BuyerSheetActions({
  actions,
  onAction,
}: {
  actions: readonly BuyerAction[];
  onAction: (kind: BuyerActionKind) => void;
}) {
  return actions.map(({ kind, disabledReason }) => {
    const { label, Icon, destructive } = BUYER_ACTION_INFO[kind];
    return (
      <div key={kind}>
        <Button
          className="w-full"
          disabled={Boolean(disabledReason)}
          onClick={() => onAction(kind)}
          size="office"
          variant={destructive ? 'destructive' : 'outline'}
        >
          <Icon aria-hidden="true" className="size-5" />
          {label}
        </Button>
        {disabledReason && (
          <p className="mt-1 text-sm text-muted-foreground">{disabledReason}</p>
        )}
      </div>
    );
  });
}
