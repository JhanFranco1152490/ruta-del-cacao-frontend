'use client';

import { ClipboardList, History } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useWriteAccess } from '@/hooks/use-write-access';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { PERMISSIONS } from '@/lib/permissions';

import { useActiveCacaoVarieties, useFarmCharacterizations } from '../api';
import {
  characterizationHistoryPath,
  characterizationPath,
} from '../characterization-paths';
import { characterizationSummary } from '../characterization-summary';
import {
  queuedSummaryLines,
  serverSummaryLines,
} from '../characterization-values';
import { CHARACTERIZATION_PLOT_DELETED_CODE } from '../sync-adapter';
import { useQueuedCharacterizations } from '../use-characterization-queue';
import { CharacterizationDiscardDialog } from './characterization-discard-dialog';

// Lo que el resumen necesita de la parcela y de su finca. Lo entrega el detalle de la finca, que
// une los dominios: este no importa del de parcelas.
export type SummaryPlot = {
  id: string;
  code: string;
  isActive: boolean;
};

// El resumen de la ficha dentro de la tarjeta de cada parcela, con su acción. Todas las
// tarjetas de una finca comparten la misma consulta de fichas.
export function PlotCharacterizationSummary({
  plot,
  farmId,
  farmIsActive,
}: {
  plot: SummaryPlot;
  farmId: string;
  farmIsActive: boolean;
}) {
  const { data: user } = useSession();
  const canCharacterize = useWriteAccess().can(PERMISSIONS.CROPS_CHARACTERIZE);
  const server = useFarmCharacterizations(user?.id, farmId);
  const catalog = useActiveCacaoVarieties(user?.id);
  const plotIds = useMemo(() => [plot.id], [plot.id]);
  const queued = useQueuedCharacterizations(user?.id, plotIds);

  const saved = server.data?.data.find((item) => item.plot_id === plot.id);
  const pending = queued.items?.[0];
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const variety of catalog.data?.data ?? [])
      map.set(variety.id, variety.name);
    for (const row of saved?.plantings ?? [])
      map.set(row.variety.id, row.variety.name);
    return map;
  }, [catalog.data, saved]);

  const failed = pending?.status === 'error';
  const plotDeleted = pending?.errorCode === CHARACTERIZATION_PLOT_DELETED_CODE;
  const summary = pending
    ? characterizationSummary(queuedSummaryLines(pending.fields, names))
    : saved
      ? characterizationSummary(serverSummaryLines(saved))
      : null;
  // Sin la lectura del servidor no se sabe si la parcela tiene ficha: decir "Sin caracterizar"
  // sería afirmar algo que no se sabe.
  const unreadable =
    !pending && !server.data && (server.isError || isPausedWithoutData(server));
  // La ficha queda congelada con su parcela o su finca inactiva.
  const canEdit =
    canCharacterize && plot.isActive && farmIsActive && !plotDeleted;
  const actionLabel = failed
    ? 'Corregir caracterización'
    : summary
      ? 'Editar caracterización'
      : unreadable
        ? 'Abrir caracterización'
        : 'Caracterizar';

  return (
    <div className="space-y-2 rounded-(--radius) bg-muted px-3 py-2 text-sm">
      {unreadable ? (
        <p className="font-bold text-warn">
          No pudimos leer la caracterización de esta parcela.
        </p>
      ) : server.isPending && !pending ? (
        <p className="text-muted-foreground">Cargando caracterización…</p>
      ) : (
        <p>
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
          {pending.errorMessage ? `: ${pending.errorMessage}` : '.'}
        </p>
      )}
      {(canEdit || failed || saved) && (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link
              aria-label={
                actionLabel === 'Caracterizar'
                  ? `Caracterizar ${plot.code}`
                  : `${actionLabel} de ${plot.code}`
              }
              className={buttonVariants({ size: 'office', variant: 'outline' })}
              href={characterizationPath(plot.id, farmId)}
            >
              <ClipboardList aria-hidden="true" className="size-4" />{' '}
              {actionLabel}
            </Link>
          )}
          {/* Solo hay historial si la ficha ya llegó al servidor: lo que espera en el dispositivo
              todavía no tiene versiones. */}
          {saved && (
            <Link
              aria-label={`Ver historial de ${plot.code}`}
              className={buttonVariants({ size: 'office', variant: 'outline' })}
              href={characterizationHistoryPath(plot.id, farmId)}
            >
              <History aria-hidden="true" className="size-4" /> Ver historial
            </Link>
          )}
          {failed && (
            <CharacterizationDiscardDialog code={plot.code} plotId={plot.id} />
          )}
        </div>
      )}
    </div>
  );
}
