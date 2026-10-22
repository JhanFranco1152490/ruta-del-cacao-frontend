import {
  STRETCHED_CARD_FOCUS_CLASS,
  STRETCHED_LINK_CLASS,
} from '@/components/stretched-link-class';
import { Eye, MapPin, MapPinned } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ProducerLine } from '@/components/producer-line';
import { Button, buttonVariants } from '@/components/ui/button';
import { parseCoordinates } from '@/lib/format/coordinates';

import type { FarmListItem } from '../farm-list-item';
import { farmDetailPath } from '../farm-paths';
import { FarmStatusBadge } from './farm-status-badge';
import { farmLabel } from '@/lib/format/place-label';

export function FarmCardList({
  farms,
  municipalityName,
  renderActions,
  onShowOnMap,
  highlightedId,
  showProducer = false,
  canOpenProducer = false,
}: {
  farms: readonly FarmListItem[];
  municipalityName: (code: string) => string;
  renderActions?: (farm: FarmListItem) => ReactNode;
  onShowOnMap?: (farm: FarmListItem) => void;
  // La finca tocada en el mapa.
  highlightedId?: string;
  // Quien no tiene productor propio ve de quién es cada finca.
  showProducer?: boolean;
  canOpenProducer?: boolean;
}) {
  return (
    <ul
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Fincas"
    >
      {farms.map((farm) => (
        <li key={farm.id}>
          <article
            aria-labelledby={`farm-${farm.id}-name`}
            className={`relative flex h-full flex-col gap-1.5 rounded-[var(--radius-card)] border border-border bg-card p-4 hover:bg-surface-alt data-[highlighted]:ring-3 data-[highlighted]:ring-cobre ${STRETCHED_CARD_FOCUS_CLASS}`}
            data-highlighted={farm.id === highlightedId || undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id={`farm-${farm.id}-name`}
                className="min-w-0 text-lg break-words text-selva"
              >
                {farmLabel(farm)}
              </h3>
              <FarmStatusBadge status={farm.status} />
            </div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <MapPin aria-hidden="true" className="size-4 text-selva" />
              {municipalityName(farm.municipalityCode)}
              <span aria-hidden="true">·</span>
              <span>{farm.areaHectares} ha</span>
            </p>
            {showProducer && farm.producer && (
              <div className="relative z-10 w-fit max-w-full">
                <ProducerLine
                  producer={farm.producer}
                  linkable={canOpenProducer}
                />
              </div>
            )}
            {farm.details && (
              <p className="truncate text-sm text-muted-foreground">
                {farm.details}
              </p>
            )}
            {farm.status === 'error' && farm.errorMessage && (
              <p className="rounded-(--radius) bg-err-bg px-3 py-2 text-sm font-bold text-err">
                {farm.errorMessage}
              </p>
            )}
            <div className="mt-auto flex items-center gap-2 pt-2">
              <Link
                aria-label={`Ver detalle de ${farm.name}`}
                className={buttonVariants({
                  size: 'office',
                  className: `min-w-0 flex-1 ${STRETCHED_LINK_CLASS}`,
                })}
                href={farmDetailPath(farm.id)}
              >
                <Eye aria-hidden="true" className="size-4" /> Ver detalle
              </Link>
              {onShowOnMap && parseCoordinates(farm.location) && (
                <Button
                  aria-label={`Ver ${farm.name} en el mapa`}
                  className="relative z-10 px-3"
                  onClick={() => onShowOnMap(farm)}
                  size="office"
                  title="Ver en el mapa"
                  type="button"
                  variant="action"
                >
                  <MapPinned aria-hidden="true" className="size-4" />
                </Button>
              )}
              {renderActions && (
                <span className="relative z-10">{renderActions(farm)}</span>
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
