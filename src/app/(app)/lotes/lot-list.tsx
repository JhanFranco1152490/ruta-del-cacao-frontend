'use client';

import { fermentationLotActions } from '@/features/fermentation/lot-actions';
import { HARVESTS_PATH } from '@/features/harvests/harvest-paths';
import { LotListScreen } from '@/features/lots/components/lot-list-screen';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Un lote se conforma desde su cosecha: «Conformar lote» lleva a las cosechas sin lote. El «⋯» de
// cada fila junta lo que ofrece cada etapa del proceso a los lotes que están en ella; al sumar el
// secado, sus acciones se agregan aquí, después de las de la fermentación.
export function LotList() {
  const { data: user } = useSession();
  const can = {
    logTurns: hasPermission(user, PERMISSIONS.FERMENTATION_LOG_TURNS),
    manage: hasPermission(user, PERMISSIONS.FERMENTATION_MANAGE),
  };
  return (
    <LotListScreen
      formLotHref={`${HARVESTS_PATH}?lote=sin`}
      lotActions={(lot) => fermentationLotActions(lot, can)}
    />
  );
}
