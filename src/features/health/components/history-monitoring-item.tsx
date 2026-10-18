'use client';

import { Images } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/schema';
import { formatShortWeekdayDate } from '@/lib/format/dates';

import { EvidenceSection } from './evidence-section';
import { MonitoringResultSection } from './monitoring-result-section';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Un monitoreo del historial en pocas líneas: cuándo y dónde, quién lo registró y su resultado, con
// sus acciones (programar un control o decidir que no hace falta). Las fotos no se cargan hasta que
// se piden: el botón dice cuántas hay.
export function HistoryMonitoringItem({
  activity,
}: {
  activity: AgriculturalActivity;
}) {
  const [showPhotos, setShowPhotos] = useState(false);
  const { monitoring } = activity;
  if (!monitoring) return null;
  const date = activity.done_date ?? activity.scheduled_date;
  const photos = monitoring.evidence_count;
  return (
    <li className="space-y-2 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-sans text-base font-extrabold text-selva">
            <span className="first-letter:uppercase">
              {formatShortWeekdayDate(date)}
            </span>
            <span className="text-foreground">
              {' '}
              · {activity.plot.code} · {activity.plot.farm.name}
            </span>
          </h2>
          {activity.completed_by && (
            <p className="text-sm text-muted-foreground">
              Registró {activity.completed_by.full_name}
            </p>
          )}
        </div>
        <Button
          aria-expanded={showPhotos}
          aria-label={
            showPhotos
              ? 'Ocultar fotos'
              : photos > 0
                ? `Ver fotos (${photos})`
                : 'Ver fotos'
          }
          className="h-9 shrink-0 text-sm"
          onClick={() => setShowPhotos((value) => !value)}
          type="button"
          variant="outline"
        >
          <Images aria-hidden="true" className="size-4" />
          <span aria-hidden="true">
            <span className="max-sm:hidden">
              {showPhotos ? 'Ocultar fotos' : 'Fotos'}
            </span>
            {!showPhotos && photos > 0 && (
              <span className="sm:ml-1">{photos}</span>
            )}
          </span>
        </Button>
      </div>
      <MonitoringResultSection
        activity={activity}
        compact
        monitoring={monitoring}
      />
      {showPhotos && <EvidenceSection activity={activity} />}
    </li>
  );
}
