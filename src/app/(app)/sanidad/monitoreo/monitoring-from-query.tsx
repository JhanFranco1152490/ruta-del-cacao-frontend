'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { MonitoringScreen } from '@/features/health/components/monitoring-screen';

export function MonitoringFromQuery() {
  const activityId = useSearchParams().get('id');
  if (!activityId) {
    return <ErrorState message="No se indicó qué monitoreo registrar." />;
  }
  // Otro monitoreo es otra captura: la pantalla se monta de nuevo.
  return <MonitoringScreen activityId={activityId} key={activityId} />;
}
