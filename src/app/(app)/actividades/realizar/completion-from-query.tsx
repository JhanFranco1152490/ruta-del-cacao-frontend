'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { CompletionScreen } from '@/features/activities/components/completion-screen';
import { monitoringPath } from '@/features/health/health-paths';

export function CompletionFromQuery() {
  const activityId = useSearchParams().get('id');
  if (!activityId) {
    return <ErrorState message="No se indicó qué actividad registrar." />;
  }
  // Otra actividad es otra captura: la pantalla se monta de nuevo.
  return (
    <CompletionScreen
      activityId={activityId}
      key={activityId}
      monitoringHref={monitoringPath}
    />
  );
}
