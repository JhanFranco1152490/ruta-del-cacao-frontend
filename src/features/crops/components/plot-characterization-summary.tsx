'use client';

import { cn } from 'cn';
import { ClipboardList, History } from 'lucide-react';
import Link from 'next/link';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';

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

// Cómo está la ficha de la parcela, dentro de su tarjeta. Sus acciones van aparte
// (`PlotCharacterizationActions`), en la fila de botones de la tarjeta.
export function PlotCharacterizationSummary(props: CardProps) {
  const { isLoading, pending, failed, summary, unreadable } =
    usePlotCharacterization(props);

  return (
    <div className="space-y-1 rounded-(--radius) bg-muted px-3 py-2 text-sm">
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
          No se pudo sincronizar la caracterización
          {pending?.errorMessage ? `: ${pending.errorMessage}` : '.'}
        </p>
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

  const [verb, ...restWords] = actionLabel.split(' ');
  const rest = restWords.join(' ');

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
              className: 'min-w-0 flex-1',
            }),
          )}
          href={characterizationPath(plot.id, farmId)}
        >
          <ClipboardList aria-hidden="true" className="size-4" />
          {/* En el celular solo el verbo: la tarjeta es angosta y el nombre accesible sigue completo. */}
          <span className="truncate">
            {verb}
            {rest && <span className="hidden sm:inline"> {rest}</span>}
          </span>
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
