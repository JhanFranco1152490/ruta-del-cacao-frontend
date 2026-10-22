'use client';

import {
  FileText,
  MapPin,
  Mountain,
  Package,
  Pencil,
  Ruler,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { EditorLink } from '@/components/editor-link';
import { LocationLink } from '@/components/location-link';
import { ProducerLine } from '@/components/producer-line';
import {
  DetailHero,
  HERO_PRIMARY_CLASS,
  HERO_SECONDARY_CLASS,
  HeroChip,
} from '@/components/page-blocks/detail-hero';
import { StatCell, StatStrip } from '@/components/page-blocks/stat-strip';
import { buttonVariants } from '@/components/ui/button';
import type { Farm } from '../api';
import { formatDateTime } from '@/lib/format/dates';
import { formatHectares } from '@/lib/format/hectares';
import { inputListPath } from '@/lib/paths/inputs';
import type { Coordinates } from '@/types/geo';

import { farmEditPath } from '../farm-paths';

// La cabecera del detalle de una finca (banner bosque): el código como marca, el
// estado, el lugar y el productor en chips, y los datos de la finca en una franja.
export function FarmDetailHeader({
  view,
  badge,
  place,
  canEdit,
  showInputs,
  showProducer,
  canOpenProducer,
  savedAt,
}: {
  view: {
    id: string;
    code?: string;
    name: string;
    producer?: Farm['producer'];
    details: string;
    areaHectares: string;
    altitudeMasl?: number | null;
    location: Coordinates;
  };
  badge: ReactNode;
  place: string;
  canEdit: boolean;
  showInputs: boolean;
  showProducer: boolean;
  canOpenProducer: boolean;
  savedAt?: number;
}) {
  const quiet = 'font-sans text-base font-bold leading-snug';
  return (
    <>
      <DetailHero
        tone="bosque"
        accent="hoja"
        actions={
          (canEdit || showInputs) && (
            <>
              {canEdit && (
                <EditorLink
                  className={buttonVariants({
                    size: 'office',
                    className: HERO_PRIMARY_CLASS,
                  })}
                  href={farmEditPath(view.id)}
                >
                  <Pencil aria-hidden="true" className="size-4" /> Editar finca
                </EditorLink>
              )}
              {showInputs && (
                <Link
                  aria-label="Insumos de esta finca"
                  className={buttonVariants({
                    size: 'office',
                    variant: 'action',
                    className: HERO_SECONDARY_CLASS,
                  })}
                  href={inputListPath(view.id, view.producer?.id)}
                >
                  <Package aria-hidden="true" className="size-4" /> Insumos
                </Link>
              )}
            </>
          )
        }
        chips={
          <>
            {badge}
            {place && (
              <HeroChip>
                <MapPin aria-hidden="true" />
                {place}
              </HeroChip>
            )}
            {showProducer && view.producer && (
              <HeroChip>
                <ProducerLine
                  linkable={canOpenProducer}
                  producer={view.producer}
                />
              </HeroChip>
            )}
            {savedAt !== undefined && (
              <HeroChip>
                Datos guardados el{' '}
                {formatDateTime(new Date(savedAt).toISOString())}
              </HeroChip>
            )}
          </>
        }
        eyebrow="Finca"
        mark={view.code}
        title={view.name}
      />
      <StatStrip accent="hoja" label="Datos de la finca">
        <StatCell
          icon={Ruler}
          label="Área total"
          value={formatHectares(view.areaHectares)}
        />
        <StatCell
          icon={Mountain}
          label="Altitud"
          value={
            view.altitudeMasl != null ? (
              `${view.altitudeMasl} m`
            ) : (
              <span className={quiet}>Sin registrar</span>
            )
          }
          note={
            view.altitudeMasl != null ? 'sobre el nivel del mar' : undefined
          }
        />
        <StatCell
          icon={MapPin}
          label="Ubicación"
          value={
            <span className="font-sans text-sm leading-snug font-bold">
              <LocationLink coordinates={view.location} withPin={false} />
            </span>
          }
        />
        <StatCell
          icon={FileText}
          label="Detalles"
          value={
            <span className={`${quiet} break-words`}>
              {view.details || 'Sin detalles'}
            </span>
          }
        />
      </StatStrip>
    </>
  );
}
