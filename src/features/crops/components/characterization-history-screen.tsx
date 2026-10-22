'use client';

import { BackLink } from '@/components/back-link';
import { Breadcrumb } from '@/components/breadcrumb';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PlotOutline } from '@/components/illustrations/plot-outline';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { useCharacterizationHistory } from '../api';
import { characterizationPath } from '../characterization-paths';
import { CharacterizationHistoryVersion } from './characterization-history-version';
import { pageContainerClass } from '@/components/page-container';
import { LoadingBlock } from '@/components/loading-block';

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
    <div className={pageContainerClass('narrow')}>
      <Breadcrumb
        items={[
          { label: 'Fincas', href: '/fincas' },
          { label: farm.name, href: farm.detailPath },
          { label: plot.code },
          { label: 'Caracterización', href: backHref },
          { label: 'Historial' },
        ]}
      />
      <div className="mt-2">
        <BackLink href={backHref}>Volver a la caracterización</BackLink>
      </div>
      <PageHeader
        tone="bosque"
        accent="hoja"
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
          <LoadingBlock
            className="space-y-4"
            label="Cargando historial"
            shapes={['h-28', 'h-28']}
          />
        ) : events.length === 0 ? (
          <EmptyState
            description="El historial empieza cuando se guarda la caracterización."
            illustration={PlotOutline}
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
