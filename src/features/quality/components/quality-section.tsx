'use client';

import { cn } from 'cn';
import { Ban, ClipboardCheck, Medal, PencilLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import {
  KeyValue,
  KeyValues,
  SectionCard,
} from '@/components/page-blocks/section-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import type { LotStatus } from '@/lib/lot-status';
import { type QualityAction, qualityActionPath } from '@/lib/paths/quality';

import { type LotQualityDetail, useQualityLot } from '../api';
import {
  qualityActions,
  type QualityActionOffer,
  qualityPermissionsOf,
} from '../quality-actions';
import { qualitySectionView } from '../quality-section-view';

export type QualitySectionLot = {
  id: string;
  code: string;
  status: LotStatus;
  quality: LotQualityDetail | null;
  dryWeightKg: string | null;
};

type LinkedOffer = QualityActionOffer & { href: string };

const ICONS: Record<QualityAction, LucideIcon> = {
  evaluar: ClipboardCheck,
  clasificar: Medal,
  corregir: PencilLine,
  descartar: Ban,
};

// Cada acción lleva a Calidad con su formulario abierto. Sin conexión se ve deshabilitada.
function SectionActions({ offers }: { offers: readonly LinkedOffer[] }) {
  if (offers.length === 0) return null;
  const reason = offers[0].disabledReason;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {offers.map((offer, index) => {
          const Icon = ICONS[offer.action];
          const variant =
            index === 0 ? 'default' : offer.danger ? 'destructive' : 'action';
          const content = (
            <>
              <Icon aria-hidden="true" className="size-4" /> {offer.label}
            </>
          );
          return reason ? (
            <Button disabled key={offer.action} size="office" variant={variant}>
              {content}
            </Button>
          ) : (
            <EditorLink
              className={cn(buttonVariants({ variant, size: 'office' }))}
              href={offer.href}
              key={offer.action}
            >
              {content}
            </EditorLink>
          );
        })}
      </div>
      {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
    </div>
  );
}

// La sección Calidad de la ficha de un lote, después del secado, desde que el lote está Seco. Lo
// que trae el lote lo ve cualquiera; quien puede evaluar ve además quién evaluó o clasificó, las
// observaciones y las acciones.
export function QualitySection({ lot }: { lot: QualitySectionLot }) {
  const { data: user } = useSession();
  const online = useHasConnection();
  const can = qualityPermissionsOf(user);
  const reachesQuality = lot.status === 'dried' || lot.quality !== null;
  const full = useQualityLot(lot.id, reachesQuality && can.evaluate && online);
  if (!reachesQuality) return null;

  const offers: LinkedOffer[] = can.evaluate
    ? qualityActions({ status: lot.status, online, can }).map((offer) => ({
        ...offer,
        href: qualityActionPath(lot.id, offer.action),
      }))
    : [];

  if (!lot.quality) {
    return (
      <SectionCard accent="cobre" title="Calidad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">Pendiente de evaluación.</p>
          <SectionActions offers={offers} />
        </div>
      </SectionCard>
    );
  }

  const view = qualitySectionView(lot.quality, full.data, lot.dryWeightKg);
  return (
    <SectionCard accent="cobre" title="Calidad">
      <div className="space-y-4">
        {view.discardedNotice && (
          <p
            className="flex gap-2 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
            role="status"
          >
            <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {view.discardedNotice}
          </p>
        )}
        <KeyValues>
          {view.evaluation.map(({ label, value }) => (
            <KeyValue key={label} label={label}>
              {value}
            </KeyValue>
          ))}
          {view.notes && (
            <KeyValue label="Observaciones">{view.notes}</KeyValue>
          )}
        </KeyValues>
        {view.evaluatedBy && (
          <p className="text-sm text-muted-foreground">{view.evaluatedBy}</p>
        )}
        {view.classification.length > 0 && (
          <>
            <h3 className="font-bold text-selva">Clasificación</h3>
            <KeyValues>
              {view.classification.map(({ label, value }) => (
                <KeyValue key={label} label={label}>
                  {value}
                </KeyValue>
              ))}
              {view.discardReason && (
                <KeyValue label="Motivo del descarte">
                  {view.discardReason}
                </KeyValue>
              )}
            </KeyValues>
            {view.classifiedBy && (
              <p className="text-sm text-muted-foreground">
                {view.classifiedBy}
              </p>
            )}
          </>
        )}
        <SectionActions offers={offers} />
      </div>
    </SectionCard>
  );
}
