'use client';

import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';

import { useReportsScreen } from '../use-reports-screen';
import { ReportFiltersBar } from './report-filters-bar';
import { ReportPanel } from './report-panel';
import { ReportStates } from './report-states';

const DESCRIPTIONS = {
  producer:
    'Tus cosechas, la calidad, la bodega, las ventas y el recorrido de cada lote, fila por fila, para revisarlos o descargarlos.',
  association:
    'La producción, la calidad y lo vendido de cada finca de los productores vinculados, para revisarlo o descargarlo.',
} as const;

// Los reportes de la vista que le toca a la cuenta: el de su unidad productiva o el de la
// asociación. Se calculan al generarlos, así que solo se abren con conexión.
export function ReportsScreen() {
  const screen = useReportsScreen();
  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        accent="cobre"
        description={DESCRIPTIONS[screen.view]}
        eyebrow="Seguimiento"
        title="Reportes"
        tone="selva"
      />
      {screen.types.length > 0 && <ReportFiltersBar screen={screen} />}
      <ReportStates screen={screen}>
        {(report) => (
          <ReportPanel
            onClear={
              screen.filters.hasFilters
                ? () => void screen.filters.clear()
                : undefined
            }
            report={report}
          />
        )}
      </ReportStates>
    </div>
  );
}
