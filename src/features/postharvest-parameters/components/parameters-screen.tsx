'use client';

import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { ProducerFilter } from '@/components/producer-filter';
import { isNeverLoaded } from '@/lib/offline/paused-read';

import { originLine, READ_ONLY_LINE, SCOPE_LINE } from '../parameters-form';
import { useParametersScreen } from '../use-parameters-screen';
import { ParametersForm } from './parameters-form';
import { ParametersReadonly } from './parameters-readonly';

const LOADING = (
  <LoadingBlock
    className={pageContainerClass('narrow', 'space-y-6')}
    label="Cargando los parámetros"
    shapes={['h-12 w-2/3', 'h-64', 'h-96']}
  />
);

// Parámetros de secado: los valores con los que se evalúa el secado y se decide cuándo avisar. Es
// un formulario de página: se cambia en línea y quien solo consulta, o no tiene conexión, ve los
// mismos valores como datos.
export function ParametersScreen() {
  const screen = useParametersScreen();
  const { read } = screen;

  if (!screen.needsProducer && isNeverLoaded(read)) {
    return (
      <PageNotice
        illustration={OfflineCloud}
        title="Necesitas conexión una vez para cargar los parámetros."
      />
    );
  }
  const parameters = read.data?.data;

  return (
    <div className={pageContainerClass('narrow', 'space-y-4')}>
      <PageHeader
        description={parameters ? originLine(parameters) : undefined}
        eyebrow="Poscosecha"
        title="Parámetros de secado"
      />
      {screen.superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => screen.setProducer(null)}
          onSelect={(id) => screen.setProducer(id)}
          producer={screen.producer ?? undefined}
          selected={screen.selectedProducer}
        />
      )}
      {screen.needsProducer && (
        <p className="text-muted-foreground">
          Elige un productor para ver sus parámetros.
        </p>
      )}
      {!screen.needsProducer && read.isPending && LOADING}
      {!screen.needsProducer && read.isError && (
        <ErrorState
          message="No fue posible cargar los parámetros."
          onRetry={() => void read.refetch()}
        />
      )}
      {parameters && (
        <>
          <p className="text-sm text-muted-foreground">{SCOPE_LINE}</p>
          {screen.fromCopy && read.data && (
            <OfflineCopyNotice
              consequence="Cambiar los parámetros necesita conexión."
              savedAt={read.data.savedAt}
            />
          )}
          {screen.canChange ? (
            <ParametersForm
              parameters={parameters}
              producer={screen.producer}
            />
          ) : (
            <>
              {!screen.mayChange && (
                <p className="font-bold text-selva">{READ_ONLY_LINE}</p>
              )}
              <ParametersReadonly
                baseline={parameters.baseline}
                values={parameters.values}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
