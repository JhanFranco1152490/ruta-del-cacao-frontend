'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { usePlotsCharacterizations } from '@/features/crops/api';
import { MonitoringScreen } from '@/features/health/components/monitoring-screen';
import { useSession } from '@/hooks/use-session';
import { useActivity } from '@/lib/api/activity-read';

// Los árboles que suma la ficha de la parcela del monitoreo, o `null` si todavía no se saben (sin
// ficha, sin siembras o sin copia en el dispositivo): entonces la planilla no limita lo que se
// evalúa y el servidor decide. La ficha es de otro dominio, así que la lee quien los une.
function usePlotTrees(activityId: string): number | null {
  const { data: user } = useSession();
  const plotId = useActivity(user?.id, activityId).data?.data.plot.id;
  const ficha = usePlotsCharacterizations(user?.id, plotId ? [plotId] : []);
  const plantings = ficha.data?.data.find(
    (item) => item.plot_id === plotId,
  )?.plantings;
  if (!plantings || plantings.length === 0) return null;
  return plantings.reduce((total, { tree_count: trees }) => total + trees, 0);
}

export function MonitoringFromQuery() {
  const activityId = useSearchParams().get('id');
  if (!activityId) {
    return <ErrorState message="No se indicó qué monitoreo registrar." />;
  }
  return <MonitoringWithPlot activityId={activityId} key={activityId} />;
}

// Otro monitoreo es otra captura: la pantalla se monta de nuevo.
function MonitoringWithPlot({ activityId }: { activityId: string }) {
  const plotTrees = usePlotTrees(activityId);
  return <MonitoringScreen activityId={activityId} plotTrees={plotTrees} />;
}
