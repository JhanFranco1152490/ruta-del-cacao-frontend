'use client';

import { cn } from 'cn';
import { Ban, ClipboardCheck, Eye, Medal, PencilLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ActionsMenu } from '@/components/actions-menu';
import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
import type { QualityAction } from '@/lib/paths/quality';

import type { LotQuality } from '../api';
import type { QualityActionOffer } from '../quality-actions';

const ICONS: Record<QualityAction, LucideIcon> = {
  evaluar: ClipboardCheck,
  clasificar: Medal,
  corregir: PencilLine,
  descartar: Ban,
};

// La primera acción es la principal; las demás van al «⋯». Ver el lote es un atajo de icono. Sin
// conexión las acciones se ven deshabilitadas, con el motivo en el aviso de la copia.
export function QualityCardActions({
  lot,
  offers,
  lotHref,
  onAction,
}: {
  lot: LotQuality;
  offers: readonly QualityActionOffer[];
  lotHref: (id: string) => string;
  onAction: (lot: LotQuality, action: QualityAction) => void;
}) {
  const [main, ...rest] = offers;
  const code = lot.lot.code;
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      {main && (
        <QualityActionButton
          code={code}
          offer={main}
          onClick={() => onAction(lot, main.action)}
        />
      )}
      {rest.length > 0 && (
        <ActionsMenu label={`Más acciones del lote ${code}`}>
          {rest.map((offer) => {
            const Icon = ICONS[offer.action];
            return (
              <MenuItem
                className={offer.danger ? 'text-destructive' : undefined}
                disabled={offer.disabledReason !== null}
                key={offer.action}
                onClick={() => onAction(lot, offer.action)}
              >
                <Icon aria-hidden="true" className="size-4" />
                {offer.label}
              </MenuItem>
            );
          })}
        </ActionsMenu>
      )}
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
    </div>
  );
}

function QualityActionButton({
  code,
  offer,
  onClick,
}: {
  code: string;
  offer: QualityActionOffer;
  onClick: () => void;
}) {
  const Icon = ICONS[offer.action];
  return (
    <Button
      aria-label={`${offer.label} el lote ${code}`}
      className="max-sm:flex-1 max-sm:px-3"
      disabled={offer.disabledReason !== null}
      onClick={onClick}
      size="office"
      title={offer.disabledReason ?? undefined}
    >
      <Icon aria-hidden="true" className="size-4 max-[400px]:hidden" />{' '}
      {offer.label}
    </Button>
  );
}
