'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useActivityAssignees } from '@/lib/api/activity-assignees';
import { useUsableInputs } from '@/lib/api/usable-inputs';
import { assignableIn } from '@/lib/assignable-accounts';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { ControlChoices } from './control-choices';

// Lo que ofrece el control de una detección de la finca `farmId`: si quien registra puede
// programar, los insumos que puede registrar como gastados y la gente que trabaja en esa finca. La
// cuenta técnica lee lo del productor de la labor; las demás cuentas, lo suyo. Cada lectura cae a
// su copia del dispositivo cuando no hay red.
export function useControlChoicesSource({
  farmId,
  producerId,
  enabled,
}: {
  farmId: string | null;
  producerId: string | null;
  enabled: boolean;
}): { choices: Omit<ControlChoices, 'today'>; isPending: boolean } {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const canSchedule = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const inputs = useUsableInputs(user, { farmId, producerId, enabled });
  // Solo quien puede programar elige responsable.
  const accounts = useActivityAssignees(
    user?.id,
    superuser ? producerId : null,
    { enabled: canSchedule && enabled && (!superuser || !!producerId) },
  );
  const assignees = useMemo(
    () =>
      farmId
        ? assignableIn(accounts.data?.data ?? [], farmId).map(
            ({ id, full_name }) => ({
              id,
              label: id === user?.id ? `${full_name} (tú)` : full_name,
            }),
          )
        : [],
    [accounts.data, farmId, user?.id],
  );
  const choices = useMemo(
    () => ({
      canSchedule,
      catalog: inputs.catalog,
      stocks: inputs.stocks,
      assignees,
    }),
    [canSchedule, inputs.catalog, inputs.stocks, assignees],
  );
  return { choices, isPending: inputs.isPending };
}
