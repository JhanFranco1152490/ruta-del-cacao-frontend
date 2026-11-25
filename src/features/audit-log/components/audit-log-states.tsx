import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ChangeLedger } from '@/components/illustrations/change-ledger';
import { LoadingBlock } from '@/components/loading-block';
import { Button } from '@/components/ui/button';

import type { AuditEntryPage } from '../api';
import type { AuditLogScreenState } from '../use-audit-log-screen';

// Lo que va debajo de los filtros: mientras no hay cambios que mostrar, por qué; y la lista
// (`children`) cuando llega.
export function AuditLogStates({
  screen,
  children,
}: {
  screen: AuditLogScreenState;
  children: (page: AuditEntryPage) => ReactNode;
}) {
  const clear = (
    <Button
      onClick={() => void screen.filters.clear()}
      size="office"
      type="button"
      variant="outline"
    >
      Limpiar filtros
    </Button>
  );

  switch (screen.content) {
    case 'needs-producer':
      return (
        <p className="text-muted-foreground">
          Elige un productor para ver su bitácora.
        </p>
      );
    case 'invalid-period':
      return (
        <EmptyState
          description="Corrige las fechas para ver los cambios de ese periodo."
          illustration={ChangeLedger}
          title="Revisa el periodo."
        />
      );
    case 'loading':
      return <LoadingBlock label="Cargando la bitácora" shapes={['h-72']} />;
    case 'error':
      return (
        <ErrorState
          message={screen.notice ?? ''}
          onRetry={() => void screen.log.refetch()}
        />
      );
    case 'filter-error':
      // Un enlace guardado con una cuenta o un tipo que ya no valen: se corrige limpiando.
      return (
        <EmptyState
          action={clear}
          description={screen.filterError ?? undefined}
          illustration={ChangeLedger}
          title="No hay registros para este filtro."
        />
      );
    case 'empty':
      return (
        <EmptyState
          description="Cuando alguien registre o modifique algo de tu unidad productiva, aparecerá aquí."
          illustration={ChangeLedger}
          title="Aún no hay cambios registrados."
        />
      );
    case 'empty-filtered':
      return (
        <EmptyState
          action={clear}
          description="Cambia el usuario, el tipo de registro o el periodo."
          illustration={ChangeLedger}
          title="No hay registros para este filtro."
        />
      );
    default:
      return screen.log.data ? children(screen.log.data) : null;
  }
}
