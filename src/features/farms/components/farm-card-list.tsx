import { MapPin, MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { parseCoordinates } from '@/lib/format/coordinates';

import type { FarmListItem } from '../farm-list-item';
import { FarmStatusBadge } from './farm-status-badge';

export function FarmCardList({
  farms,
  municipalityName,
  renderActions,
  onShowOnMap,
  highlightedId,
}: {
  farms: readonly FarmListItem[];
  municipalityName: (code: string) => string;
  renderActions?: (farm: FarmListItem) => ReactNode;
  onShowOnMap?: (farm: FarmListItem) => void;
  // La finca tocada en el mapa.
  highlightedId?: string;
}) {
  return (
    // Una columna en escritorio ancho: ahí la lista comparte el ancho con el mapa.
    <ul
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-1"
      aria-label="Fincas"
    >
      {farms.map((farm) => (
        <li key={farm.id}>
          <article
            aria-labelledby={`farm-${farm.id}-name`}
            className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-card p-5 data-[highlighted]:ring-3 data-[highlighted]:ring-cobre"
            data-highlighted={farm.id === highlightedId || undefined}
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
            {(onShowOnMap || renderActions) && (
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {onShowOnMap && parseCoordinates(farm.location) && (
                  <Button
                    aria-label={`Ver ${farm.name} en el mapa`}
                    onClick={() => onShowOnMap(farm)}
                    size="office"
                    type="button"
                    variant="outline"
                  >
                    <MapPinned aria-hidden="true" className="size-4" /> Ver en
                    el mapa
                  </Button>
                )}
                {renderActions?.(farm)}
              </div>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
