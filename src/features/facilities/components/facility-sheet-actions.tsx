'use client';

import { Button } from '@/components/ui/button';

import type { FacilityAction, FacilityActionKind } from '../facility-actions';
import { FACILITY_ACTION_INFO } from './facility-action-info';

// Las acciones de un elemento en su hoja del celular: botones a lo ancho, con el motivo debajo del
// que no se puede usar.
export function FacilitySheetActions({
  actions,
  offline,
  onAction,
}: {
  actions: readonly FacilityAction[];
  offline: boolean;
  onAction: (kind: FacilityActionKind) => void;
}) {
  return actions.map(({ kind, disabledReason }) => {
    const { label, Icon, destructive, online } = FACILITY_ACTION_INFO[kind];
    return (
      <div key={kind}>
        <Button
          className="w-full"
          disabled={Boolean(disabledReason) || (online && offline)}
          onClick={() => onAction(kind)}
          size="field"
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
