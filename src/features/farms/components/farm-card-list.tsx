import { MapPin } from 'lucide-react';

import type { FarmListItem } from '../farm-list-item';
import { FarmStatusBadge } from './farm-status-badge';

export function FarmCardList({
  farms,
  municipalityName,
}: {
  farms: readonly FarmListItem[];
  municipalityName: (code: string) => string;
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2" aria-label="Fincas">
      {farms.map((farm) => (
        <li key={farm.id}>
          <article
            aria-labelledby={`farm-${farm.id}-name`}
            className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 id={`farm-${farm.id}-name`} className="text-xl text-selva">
                {farm.name}
              </h3>
              <FarmStatusBadge status={farm.status} />
            </div>
            <p className="flex items-center gap-2 font-bold text-foreground">
              <MapPin aria-hidden="true" className="size-4 text-selva" />
              {municipalityName(farm.municipalityCode)}
            </p>
            {farm.details && (
              <p className="text-muted-foreground">{farm.details}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Área:{' '}
              <strong className="text-foreground">
                {farm.areaHectares} ha
              </strong>
            </p>
            {farm.status === 'error' && farm.errorMessage && (
              <p className="rounded-(--radius) bg-err-bg px-3 py-2 text-sm font-bold text-err">
                {farm.errorMessage}
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
