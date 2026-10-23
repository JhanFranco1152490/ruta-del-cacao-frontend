'use client';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FILTER_CONTROLS_CLASS } from '@/components/filter-row';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { ProducerFilter } from '@/components/producer-filter';
import { SearchSelect } from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';
import { farmLabel } from '@/lib/format/place-label';
import { isNeverLoaded } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useFermentations, useReadyLots } from '../api';
import {
  countOverdue,
  fermentationsOfFarm,
  readyLotsOfFarm,
} from '../fermentation-list';
import {
  type FermentationView,
  useFermentationFilters,
} from '../use-fermentation-filters';
import { FermentationOfflineNotice } from './fermentation-offline-notice';
import { FermentationSummary } from './fermentation-summary';
import { InProgressTab } from './in-progress-tab';
import { ReadyLotsTab } from './ready-lots-tab';

const NEEDS_CONNECTION =
  'Necesitas conexión una vez para cargar los lotes en fermentación.';

// Fermentación: el trabajo del día de quien fermenta. Los lotes en fermentación se ven también sin
// conexión, con la copia del dispositivo; los listos para fermentar, y la pestaña que los muestra,
// solo con conexión y para quien puede iniciar. La finca se filtra en el dispositivo. La ficha del
// lote es de otro dominio: su ruta la entrega quien monta la pantalla.
export function FermentationScreen({
  lotHref,
}: {
  lotHref: (id: string) => string;
}) {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const hasConnection = useHasConnection();
  const state = useFermentationFilters();
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? state.producer : null;
  const needsProducer = superuser && !producer;
  const canManage = hasPermission(user, PERMISSIONS.FERMENTATION_MANAGE);
  const view: FermentationView = canManage ? state.view : 'en-curso';

  const read = useFermentations(user?.id, producer, {
    enabled: !needsProducer,
  });
  const offline = !hasConnection || read.data?.savedAt !== undefined;
  const ready = useReadyLots(producer, {
    enabled: canManage && !needsProducer && !offline,
  });
  const farms = useFarmOptions(user?.id, producer ?? undefined, {
    enabled: !needsProducer,
  });
  const selectedProducer = useProducerSummary(producer ?? undefined);

  const farmOptions = (farms.data?.data.options ?? []).map((farm) => ({
    id: farm.id,
    label: farmLabel(farm),
    name: farm.name,
  }));
  const chosenFarm = farmOptions.find(({ id }) => id === state.farm);
  const farmName = state.farm ? (chosenFarm?.name ?? 'esta finca') : null;
  const now = new Date();
  const shown = fermentationsOfFarm(read.data?.data ?? [], state.farm);
  const readyShown =
    canManage && !offline && ready.data
      ? readyLotsOfFarm(ready.data, state.farm)
      : undefined;

  const body = () => {
    if (needsProducer) {
      return (
        <p className="text-muted-foreground">
          Elige un productor para ver sus lotes en fermentación.
        </p>
      );
    }
    if (view === 'listos') {
      return (
        <ReadyLotsTab
          farmName={farmName}
          isError={ready.isError}
          isPending={ready.isPending}
          lots={readyShown ?? []}
          offline={offline}
          onClear={state.clear}
          onRetry={() => void ready.refetch()}
        />
      );
    }
    if (isNeverLoaded(read)) {
      return (
        <EmptyState illustration={OfflineCloud} title={NEEDS_CONNECTION} />
      );
    }
    if (read.isPending) {
      return <LoadingBlock label="Cargando fermentaciones" shapes={['h-40']} />;
    }
    if (!read.data) {
      return (
        <ErrorState
          message="No fue posible cargar los lotes en fermentación."
          onRetry={() => void read.refetch()}
        />
      );
    }
    return (
      <InProgressTab
        farmName={farmName}
        fermentations={shown}
        lotHref={lotHref}
        now={now}
        onClear={state.clear}
        onShowReady={
          readyShown?.length ? () => void state.setView('listos') : undefined
        }
      />
    );
  };

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        tone="selva"
        accent="cobre"
        description="Los lotes que fermentan en tus cajones, cuándo toca su próximo volteo y los que están listos para empezar."
        eyebrow="Poscosecha"
        title="Fermentación"
      />
      {superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => void state.setProducer(null)}
          onSelect={(id) => void state.setProducer(id)}
          producer={producer ?? undefined}
          selected={selectedProducer}
        />
      )}
      {read.data && (
        <FermentationSummary
          inProgress={shown.length}
          overdue={countOverdue(shown, now)}
          ready={readyShown?.length}
        />
      )}
      {!needsProducer && (
        <div
          className={`flex flex-wrap items-start gap-3 ${FILTER_CONTROLS_CLASS}`}
        >
          {canManage && (
            <SegmentedControl<FermentationView>
              fullWidth
              label="Vista de fermentación"
              onChange={(next) => void state.setView(next)}
              options={[
                { value: 'en-curso', label: 'En fermentación' },
                { value: 'listos', label: 'Listos para fermentar' },
              ]}
              value={view}
            />
          )}
          {farmOptions.length > 1 && (
            <SearchSelect
              allLabel="Todas las fincas"
              className="w-full sm:w-72"
              compact
              hideLabel
              label="Finca"
              onChange={(option) => void state.setFarm(option?.id ?? null)}
              options={farmOptions}
              value={
                state.farm
                  ? (chosenFarm ?? { id: state.farm, label: farmName ?? '' })
                  : null
              }
            />
          )}
        </div>
      )}
      {read.isSuccess && offline && (
        <FermentationOfflineNotice savedAt={read.data.savedAt} />
      )}
      {body()}
    </div>
  );
}
