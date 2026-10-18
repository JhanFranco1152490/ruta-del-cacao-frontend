'use client';

import { Images } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/schema';
import { formatWeekdayLongDate } from '@/lib/format/dates';

import { EvidenceSection } from './evidence-section';
import { MonitoringResultSection } from './monitoring-result-section';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const photosText = (count: number) =>
  count === 1 ? '1 foto' : `${count} fotos`;

// Un monitoreo del historial: cuándo se hizo y en qué parcela, quién lo registró y su resultado,
// con sus acciones (programar un control o decidir que no hace falta). Las fotos no se cargan hasta
// que se piden: solo se dice cuántas hay.
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
    <li className="space-y-3 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl text-selva first-letter:uppercase">
            {formatWeekdayLongDate(date)}
          </h2>
          <p className="font-bold">
            {activity.plot.code} · {activity.plot.farm.name}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {activity.completed_by &&
            `Registró ${activity.completed_by.full_name}`}
          {photos > 0 && ` · ${photosText(photos)}`}
        </p>
      </div>
      <MonitoringResultSection activity={activity} monitoring={monitoring} />
      <Button
        aria-expanded={showPhotos}
        className="h-11"
        onClick={() => setShowPhotos((value) => !value)}
        type="button"
        variant="outline"
      >
        <Images aria-hidden="true" className="size-4" />
        {showPhotos
          ? 'Ocultar fotos'
          : photos > 0
            ? `Ver fotos (${photos})`
            : 'Fotos'}
      </Button>
      {showPhotos && <EvidenceSection activity={activity} />}
    </li>
  );
}
