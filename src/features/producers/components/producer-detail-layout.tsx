'use client';

import { Lock, MapPin, Pencil, ShieldCheck, ShieldOff } from 'lucide-react';
import type { ReactNode } from 'react';

import { DetailFooter } from '@/components/detail-footer';
import { EditorLink } from '@/components/editor-link';
import { MaskedValue } from '@/components/masked-value';
import {
  DetailHero,
  HERO_PRIMARY_CLASS,
  HeroChip,
} from '@/components/page-blocks/detail-hero';
import {
  KeyValue,
  KeyValues,
  SectionCard,
} from '@/components/page-blocks/section-card';
import { StatCell, StatStrip } from '@/components/page-blocks/stat-strip';
import { buttonVariants } from '@/components/ui/button';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { formatLongDate } from '@/lib/format/dates';

import type { Producer } from '../api';
import { ProducerAccountCard } from './producer-account-card';
import { ProducerActionsMenu } from './producer-actions-menu';
import { ProducerDeleteDialog } from './producer-delete-dialog';
import { ProducerStatusBadge } from './producer-status-badge';
import { ProducerStatusDialog } from './producer-status-dialog';

// La ficha del productor: cabecera clara con sus datos de un vistazo, una franja con
// las cifras y el estado de acceso, las fincas en filas y sus datos en dos niveles. Sin marca de
// iniciales: no dicen nada que no diga el nombre de al lado.
export function ProducerDetailLayout({
  producer,
  municipalityName,
  farms,
  canDelete,
  onDeleted,
  backHref,
  breadcrumb,
}: {
  producer: Producer;
  municipalityName: (code: string) => string;
  farms?: { stats: ReactNode; list: ReactNode };
  canDelete: boolean;
  onDeleted: () => void;
  backHref: string;
  breadcrumb: ReactNode;
}) {
  const name = `${producer.first_name} ${producer.last_name}`;
  const editHref = `/productores/${producer.id}/editar`;
  const active = producer.status === 'active';
  const isDesktop = useIsDesktop();
  return (
    <>
      {breadcrumb}
      <DetailHero
        tone="claro"
        accent="cobre"
        actions={
          <>
            <EditorLink
              className={buttonVariants({
                size: 'office',
                className: HERO_PRIMARY_CLASS,
              })}
              href={editHref}
            >
              <Pencil aria-hidden="true" className="size-4" /> Editar datos
            </EditorLink>
            {/* Con espacio, cada acción es un botón; en celular, las de poco uso van en «⋯». */}
            {isDesktop ? (
              <>
                <ProducerStatusDialog
                  producer={producer}
                  target={active ? 'inactive' : 'active'}
                />
                {canDelete && (
                  <ProducerDeleteDialog
                    onDone={onDeleted}
                    producer={producer}
                  />
                )}
              </>
            ) : (
              <ProducerActionsMenu
                canDelete={canDelete}
                onDeleted={onDeleted}
                producer={producer}
              />
            )}
          </>
        }
        chips={
          <>
            <HeroChip>{producer.member_code}</HeroChip>
            <ProducerStatusBadge status={producer.status} />
            <HeroChip>
              <MapPin aria-hidden="true" />
              {municipalityName(producer.municipality_code)}
            </HeroChip>
            <HeroChip>
              Socio desde {formatLongDate(producer.joined_on)}
            </HeroChip>
          </>
        }
        eyebrow="Productor asociado"
        title={name}
      />
      {farms && (
        <StatStrip accent="cobre" label="Resumen del productor">
          {farms.stats}
          <StatCell
            icon={active ? ShieldCheck : ShieldOff}
            label="Acceso"
            note={
              active
                ? 'Su cuenta y la de sus empleados'
                : 'Cuenta y empleados bloqueados'
            }
            value={
              <span className="font-sans text-lg font-extrabold">
                {active ? 'Activo' : 'Inactivo'}
              </span>
            }
          />
        </StatStrip>
      )}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4">
          {farms?.list}
          <ProducerAccountCard producer={producer} />
        </div>
        <SectionCard
          accent="cobre"
          actions={
            <EditorLink
              aria-label="Editar datos del productor"
              className={buttonVariants({
                variant: 'action',
                size: 'icon',
                className: 'size-10',
              })}
              href={editHref}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </EditorLink>
          }
          title="Datos del productor"
        >
          <KeyValues>
            <KeyValue label="Documento">
              <MaskedValue
                prefix={producer.document_type}
                value={producer.identity_document}
              />
            </KeyValue>
            <KeyValue label="Teléfono">
              {producer.phone ? (
                <MaskedValue value={producer.phone} />
              ) : (
                <span className="font-medium text-muted-foreground">
                  Sin registrar
                </span>
              )}
            </KeyValue>
            <KeyValue label="Correo electrónico">
              {producer.email ? (
                <MaskedValue value={producer.email} />
              ) : (
                <span className="font-medium text-muted-foreground">
                  Sin registrar
                </span>
              )}
            </KeyValue>
            <KeyValue label="Municipio">
              {municipalityName(producer.municipality_code)}
            </KeyValue>
            <KeyValue label="Vinculado desde">
              {formatLongDate(producer.joined_on)}
            </KeyValue>
            <KeyValue label="Código de asociado">
              {producer.member_code}
            </KeyValue>
          </KeyValues>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Los datos sensibles se muestran protegidos. La consulta completa
            queda en la bitácora general.
          </p>
        </SectionCard>
      </div>
      <div className="mt-6">
        <DetailFooter backHref={backHref} />
      </div>
    </>
  );
}
