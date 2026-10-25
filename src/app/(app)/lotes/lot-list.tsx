'use client';

import {
  dryingLotActions,
  dryingStageAction,
} from '@/features/drying/lot-actions';
import {
  fermentationLotActions,
  fermentationStageAction,
} from '@/features/fermentation/lot-actions';
import { HARVESTS_PATH } from '@/features/harvests/harvest-paths';
import { LotListScreen } from '@/features/lots/components/lot-list-screen';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Un lote se conforma desde su cosecha: «Conformar lote» lleva a las cosechas sin lote. El «⋯» de
// cada fila junta lo que ofrece cada etapa del proceso a los lotes que están en ella (y el botón de
// la cabecera lleva a donde se trabaja el estado que se mira). Cada etapa nueva suma aquí sus
// acciones, después de las de la anterior.
export function LotList() {
  const { data: user } = useSession();
  const fermentationCan = {
    logTurns: hasPermission(user, PERMISSIONS.FERMENTATION_LOG_TURNS),
    manage: hasPermission(user, PERMISSIONS.FERMENTATION_MANAGE),
  };
  const dryingCan = {
    logLogs: hasPermission(user, PERMISSIONS.DRYING_LOG),
    manage: hasPermission(user, PERMISSIONS.DRYING_MANAGE),
  };
  return (
    <LotListScreen
      formLotHref={`${HARVESTS_PATH}?lote=sin`}
      lotActions={(lot) => [
        ...fermentationLotActions(lot, fermentationCan),
        ...dryingLotActions(lot, dryingCan),
      ]}
      stageAction={(status) =>
        fermentationStageAction(status, fermentationCan) ??
        dryingStageAction(status, dryingCan)
      }
    />
  );
}
