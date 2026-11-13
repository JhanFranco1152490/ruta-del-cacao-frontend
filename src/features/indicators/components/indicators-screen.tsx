'use client';

import { IndicatorBars } from '@/components/illustrations/indicator-bars';
import { EmptyState } from '@/components/empty-state';
import { LoadingBlock } from '@/components/loading-block';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';

import { hasAssociationFigures, hasProducerFigures } from '../indicator-charts';
import { useIndicatorsScreen } from '../use-indicators-screen';
import { AssociationPanel } from './association-panel';
import { IndicatorFiltersBar } from './indicator-filters-bar';
import { IndicatorPanelStates } from './indicator-states';
import { ProducerPanel } from './producer-panel';

const DESCRIPTIONS = {
  producer:
    'Lo que producen tus parcelas, su calidad, lo que hay en bodega y lo que vendes, calculado con lo que ya registraste.',
  association:
    'La producción, la calidad y lo vendido de cada finca de los productores vinculados.',
} as const;

// Los indicadores del periodo, del panel que le toca a la cuenta: el de su unidad productiva o el de
// la asociación. Se calculan al consultar, así que solo se abren con conexión.
export function IndicatorsScreen() {
  const screen = useIndicatorsScreen();
  const { view } = screen;
  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        accent="cobre"
        description={DESCRIPTIONS[view ?? 'producer']}
        eyebrow="Seguimiento"
        title="Indicadores"
        tone="selva"
      />
      <IndicatorFiltersBar screen={screen} />
      {screen.sessionPending && (
        <LoadingBlock label="Cargando indicadores" shapes={['h-24', 'h-64']} />
      )}
      {screen.needsProducer && (
        <section className="rounded-lg bg-card shadow-card">
          <EmptyState
            description="Elige un productor para ver los indicadores de su unidad productiva."
            illustration={IndicatorBars}
            title="Falta elegir el productor."
          />
        </section>
      )}
      {view === 'producer' && !screen.needsProducer && (
        <IndicatorPanelStates
          emptyDescription="Cuando se registren cosechas, calidad, bodega o ventas, aparecerán aquí."
          emptyTitle="Aún no hay cifras en este periodo."
          hasFigures={hasProducerFigures}
          query={screen.producer}
        >
          {(data) => <ProducerPanel data={data} />}
        </IndicatorPanelStates>
      )}
      {view === 'association' && (
        <IndicatorPanelStates
          emptyDescription="Ninguna finca registró cosechas, calidad o ventas en el periodo."
          emptyTitle="Aún no hay cifras en este periodo."
          hasFigures={hasAssociationFigures}
          query={screen.association}
        >
          {(data) => <AssociationPanel data={data} />}
        </IndicatorPanelStates>
      )}
    </div>
  );
}
