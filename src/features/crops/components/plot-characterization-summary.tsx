'use client';

import { cn } from 'cn';
import { ClipboardList, History } from 'lucide-react';
import Link from 'next/link';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';
import { syncFailureText } from '@/components/sync-rejected-notice';

import {
  characterizationHistoryPath,
  characterizationPath,
} from '../characterization-paths';
import {
  type SummaryPlot,
  usePlotCharacterization,
} from '../use-plot-characterization';
import { CharacterizationDiscardDialog } from './characterization-discard-dialog';

type CardProps = {
  plot: SummaryPlot;
  farmId: string;
  farmIsActive: boolean;
  // Las parcelas de la página en que está la tarjeta, cuando no son las de una sola finca.
  pagePlotIds?: readonly string[];
};

type SummaryProps = CardProps & {
  // Sin acciones, solo dice cómo está la ficha (la pantalla de parcelas).
  withActions?: boolean;
};

// Cómo está la ficha de la parcela, dentro de su tarjeta, y a su derecha lo que se hace con ella: así
// la franja es una sola cosa y la parcela no carga con botones de la ficha.
export function PlotCharacterizationSummary({
  withActions = true,
  ...props
}: SummaryProps) {
  const { isLoading, pending, failed, summary, unreadable } =
    usePlotCharacterization(props);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-(--radius) bg-muted px-3 py-2 text-sm">
      <div className="min-w-48 flex-1 space-y-1">
        {unreadable ? (
          <p className="font-bold text-warn">
            No pudimos leer la caracterización de esta parcela.
          </p>
        ) : isLoading ? (
          <p className="text-muted-foreground">Cargando caracterización…</p>
        ) : (
          <p className="line-clamp-2">
            <span className="font-bold text-selva">Caracterización: </span>
            {summary ?? (
              <span className="font-bold text-muted-foreground">
                Sin caracterizar
              </span>
            )}
          </p>
        )}
        {pending && !failed && (
          <p className="font-bold text-info">
            Pendiente de sincronizar en este dispositivo.
          </p>
        )}
        {failed && (
          <p className="font-bold text-err">
            {syncFailureText(pending?.errorMessage, 'la caracterización')}
          </p>
        )}
      </div>
      {withActions && (
        <div className="flex items-center gap-2">
          <PlotCharacterizationActions {...props} />
        </div>
      )}
    </div>
  );
}

// Lo que se hace con la ficha: caracterizarla o editarla (la acción principal de la tarjeta, que
// toma el ancho que sobra), ver su historial y, si el servidor la rechazó, descartarla.
export function PlotCharacterizationActions(props: CardProps) {
  const { plot, farmId } = props;
  const { saved, failed, canEdit, actionLabel } =
    usePlotCharacterization(props);

  const [verb] = actionLabel.split(' ');

  return (
    <>
      {canEdit && (
        <EditorLink
          aria-label={
            actionLabel === 'Caracterizar'
              ? `Caracterizar ${plot.code}`
              : `${actionLabel} de ${plot.code}`
          }
          className={cn(
            buttonVariants({
              size: 'office',
              variant: 'action',
              className: 'min-w-0',
            }),
          )}
          href={characterizationPath(plot.id, farmId)}
        >
          <ClipboardList aria-hidden="true" className="size-4" />
          {/* Solo el verbo: la franja es angosta y el nombre accesible sigue completo. */}
          <span className="truncate">{verb}</span>
        </EditorLink>
      )}
      {/* Solo hay historial si la ficha ya llegó al servidor: lo que espera en el dispositivo
          todavía no tiene versiones. */}
      {saved && (
        <Link
          aria-label={`Ver historial de ${plot.code}`}
          className={cn(
            buttonVariants({
              size: 'office',
              variant: 'action',
              className: 'px-3',
            }),
          )}
          href={characterizationHistoryPath(plot.id, farmId)}
          title="Ver historial de la caracterización"
        >
          <History aria-hidden="true" className="size-4" />
        </Link>
      )}
      {failed && (
        <CharacterizationDiscardDialog code={plot.code} plotId={plot.id} />
      )}
    </>
  );
}
