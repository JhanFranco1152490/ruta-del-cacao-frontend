'use client';

import { useState } from 'react';

import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { ProducerFilter } from '@/components/producer-filter';

import { OFFLINE_QUALITY_REASON } from '../quality-actions';
import { useActionFromLink } from '../use-action-from-link';
import { useQualityScreen } from '../use-quality-screen';
import {
  type OpenQualityAction,
  QualityActionDialog,
} from './quality-action-dialog';
import { QualityBody } from './quality-body';
import { QualityFiltersBar } from './quality-filters-bar';
import { QualitySummary } from './quality-summary';

// Calidad: los lotes secos por evaluar, los evaluados por clasificar o descartar, y los cerrados.
// La ficha del lote es de otro dominio: su ruta la entrega quien monta la pantalla.
export function QualityScreen({
  lotHref,
}: {
  lotHref: (id: string) => string;
}) {
  const screen = useQualityScreen();
  const { filters, list } = screen;
  const [open, setOpen] = useState<OpenQualityAction>();
  const openAction = (
    lot: OpenQualityAction['lot'],
    action: OpenQualityAction['action'],
  ) => setOpen({ lot, action });
  useActionFromLink({
    pending: filters.pendingAction,
    online: !screen.offline,
    can: screen.can,
    onOpen: openAction,
    onDone: filters.clearAction,
  });

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        tone="selva"
        accent="cobre"
        description="Evalúa el grano de cada lote seco y clasifícalo por calibre o descártalo."
        eyebrow="Poscosecha"
        title="Calidad"
      />
      {screen.superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          producer={screen.producer ?? undefined}
          selected={screen.selectedProducer}
        />
      )}
      {!screen.needsProducer && (
        <>
          <QualitySummary summary={screen.summary.data?.data} />
          <QualityFiltersBar screen={screen} />
        </>
      )}
      {list.isSuccess && screen.offline && (
        <OfflineCopyNotice
          consequence={OFFLINE_QUALITY_REASON}
          savedAt={list.data.savedAt}
        />
      )}
      <QualityBody lotHref={lotHref} onAction={openAction} screen={screen} />
      {open && (
        <QualityActionDialog onClose={() => setOpen(undefined)} open={open} />
      )}
    </div>
  );
}
