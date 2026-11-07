'use client';

import { cn } from 'cn';
import { Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { StockExit } from '../api';
import type { Offer } from '../warehouse-actions';
import type { ExitLine } from '../warehouse-section-view';

// Las salidas del lote, de la más reciente a la más antigua. Una anulada sigue en la lista,
// tachada y con quién la anuló y por qué: las salidas no se borran.
export function StockExitHistory({
  lines,
  voidOfferOf,
  onVoid,
}: {
  lines: readonly ExitLine[];
  voidOfferOf: (exit: StockExit) => Offer<'anular'> | null;
  onVoid: (exit: StockExit) => void;
}) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no ha salido cacao de este lote.
      </p>
    );
  }
  return (
    <ul aria-label="Salidas del lote" className="divide-y divide-border">
      {lines.map((line) => {
        const offer = voidOfferOf(line.exit);
        return (
          <li
            className="flex flex-wrap items-start justify-between gap-3 py-3"
            key={line.exit.id}
          >
            <div className="min-w-0 space-y-0.5">
              <p
                className={cn(
                  'font-bold tabular-nums',
                  line.voided && 'text-muted-foreground line-through',
                )}
              >
                {line.title}
              </p>
              <p className="text-sm text-muted-foreground">{line.detail}</p>
              {line.voided && <p className="text-sm">{line.voided}</p>}
            </div>
            {offer && (
              <Button
                aria-label={`Anular la salida: ${line.title}`}
                disabled={offer.disabledReason !== null}
                onClick={() => onVoid(line.exit)}
                size="office"
                title={offer.disabledReason ?? undefined}
                variant="action"
              >
                <Undo2 aria-hidden="true" className="size-4" />
                {offer.label}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
