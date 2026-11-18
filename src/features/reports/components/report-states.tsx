import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ReportSheets } from '@/components/illustrations/report-sheets';
import { LoadingBlock } from '@/components/loading-block';

import type { Report } from '../api';
import type { ReportsScreenState } from '../use-reports-screen';

const card = (children: ReactNode) => (
  <section className="rounded-lg bg-card shadow-card">{children}</section>
);

// Lo que va debajo de los filtros: mientras no hay reporte, por qué; y el reporte (`children`)
// cuando llega.
export function ReportStates({
  screen,
  children,
}: {
  screen: ReportsScreenState;
  children: (report: Report) => ReactNode;
}) {
  switch (screen.content) {
    case 'session':
    case 'loading':
      return (
        <LoadingBlock
          label="Generando el reporte"
          shapes={['h-16', 'h-20', 'h-72']}
        />
      );
    case 'no-types':
      // Es una falta de permiso, no algo del módulo: va con la mata, como «sin permiso».
      return card(
        <EmptyState
          description="Pide a quien administra tu cuenta el permiso de cosechas, lotes, bodega o ventas."
          title="No tienes reportes disponibles."
        />,
      );
    case 'error':
      return (
        <ErrorState
          message={screen.notice ?? ''}
          onRetry={() => void screen.report.refetch()}
        />
      );
    case 'report':
      return screen.report.data ? children(screen.report.data) : null;
    default:
      return card(
        <EmptyState
          description="Elige el tipo de reporte y los filtros, y toca Generar."
          illustration={ReportSheets}
          title="Aún no hay un reporte."
        />,
      );
  }
}
