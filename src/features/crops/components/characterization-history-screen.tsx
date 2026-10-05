'use client';

import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { useCharacterizationHistory } from '../api';
import { characterizationPath } from '../characterization-paths';
import { CharacterizationHistoryVersion } from './characterization-history-version';

export type HistoryFarm = { id: string; name: string; detailPath: string };
export type HistoryPlot = { id: string; code: string };

// Las versiones de la ficha de una parcela, de la más nueva a la más vieja. Es una consulta de
// oficina: sin conexión lo dice en vez de quedarse cargando.
export function CharacterizationHistoryScreen({
  farm,
  plot,
}: {
  farm: HistoryFarm;
  plot: HistoryPlot;
}) {
  const history = useCharacterizationHistory(plot.id);
  const backHref = characterizationPath(plot.id, farm.id);
  const events = history.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link className="font-bold text-cobre underline" href={farm.detailPath}>
          {farm.name}
        </Link>{' '}
        <span aria-hidden="true">›</span> {plot.code}{' '}
        <span aria-hidden="true">›</span> Historial
      </nav>
      <PageHeader
        actions={
          <Link
            className={buttonVariants({ size: 'office', variant: 'outline' })}
            href={backHref}
          >
            Volver a la caracterización
          </Link>
        }
        description="Cada vez que se guarda la ficha queda una versión, con lo que cambió y quién la guardó."
        eyebrow="Caracterización productiva"
        title={`Historial de ${plot.code}`}
      />
      <div className="mt-8">
        {isPausedWithoutData(history) ? (
          <p className="font-bold text-warn" role="status">
            Necesitas conexión para ver el historial de la ficha.
          </p>
        ) : history.isError ? (
          <ErrorState
            message="No fue posible cargar el historial. Revisa tu conexión e inténtalo nuevamente."
            onRetry={() => void history.refetch()}
          />
        ) : history.isPending ? (
          <div
            aria-label="Cargando historial"
            className="space-y-4"
            role="status"
          >
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            description="El historial empieza cuando se guarda la caracterización."
            title="Esta parcela todavía no tiene versiones"
          />
        ) : (
          <>
            <ol aria-label="Versiones de la ficha" className="space-y-4">
              {events.map((event, index) => (
                <CharacterizationHistoryVersion
                  event={event}
                  key={event.version}
                  // La siguiente de la lista es la anterior en el tiempo. La última cargada no
                  // la tiene hasta que se pidan más.
                  previous={events[index + 1]?.snapshot ?? null}
                />
              ))}
            </ol>
            {history.hasNextPage && (
              <Button
                className="mt-6"
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
                size="office"
                variant="outline"
              >
                {history.isFetchingNextPage
                  ? 'Cargando…'
                  : 'Cargar más versiones'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
