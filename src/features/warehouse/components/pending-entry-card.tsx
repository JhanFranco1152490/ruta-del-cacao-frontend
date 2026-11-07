'use client';

import { cn } from 'cn';
import { Eye, PackagePlus } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatShortDayMonth } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';

import type { PendingEntry } from '../api';
import type { DialogRequest } from '../dialog-request';
import { kilosText } from '../exit-quantity';
import type { Offer } from '../warehouse-actions';

// «G1 250,0 kg · G2 55,2 kg · clasificado el 29 oct»: lo que va a entrar a la bodega.
export const pendingEntryLine = (lot: PendingEntry) =>
  `G1 ${kilosText(lot.g1_kg)} kg · G2 ${kilosText(lot.g2_kg)} kg · clasificado el ${formatShortDayMonth(lot.classified_at)}`;

// Un lote Clasificado que espera su ingreso: el código y la finca, lo clasificado y la acción.
export function PendingEntryCard({
  lot,
  entryOffer,
  lotHref,
  onAction,
}: {
  lot: PendingEntry;
  entryOffer: Offer<'ingresar'> | null;
  lotHref: ((id: string) => string) | null;
  onAction: (request: DialogRequest) => void;
}) {
  const code = lot.lot.code;
  return (
    <li className="flex flex-col gap-3 rounded-(--radius-card) bg-card p-4 shadow-card">
      <div className="min-w-0 space-y-0.5">
        <p className="font-mono font-bold break-all">{code}</p>
        <p className="text-sm text-muted-foreground">{farmLabel(lot.farm)}</p>
      </div>
      <p className="text-sm tabular-nums">{pendingEntryLine(lot)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {entryOffer && (
          <Button
            aria-label={`Ingresar a bodega el lote ${code}`}
            className="max-sm:flex-1"
            disabled={entryOffer.disabledReason !== null}
            onClick={() => onAction({ action: 'ingresar', lotId: lot.lot.id })}
            size="office"
            title={entryOffer.disabledReason ?? undefined}
          >
            <PackagePlus aria-hidden="true" className="size-4" />
            {entryOffer.label}
          </Button>
        )}
        {lotHref && (
          <EditorLink
            aria-label={`Ver el lote ${code}`}
            className={cn(
              buttonVariants({ variant: 'action', size: 'office' }),
              'px-3',
            )}
            href={lotHref(lot.lot.id)}
          >
            <Eye aria-hidden="true" className="size-4" />
          </EditorLink>
        )}
      </div>
    </li>
  );
}
