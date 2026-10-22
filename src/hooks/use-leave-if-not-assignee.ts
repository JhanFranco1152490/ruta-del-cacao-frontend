import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from '@/hooks/use-session';
import { mayRecordFor } from '@/lib/activity-recorders';

// Quien llega escribiendo la dirección de una labor que no le toca registrar vuelve a la pantalla
// de antes sin aviso: el botón ya no se le ofrece, y lo que guardara el servidor lo rechazaría.
// `assigneeId` llega cuando la labor ya se leyó; antes no se decide nada. Dice si se está yendo,
// para no dibujar la captura mientras tanto.
export function useLeaveIfNotAssignee(
  assigneeId: string | undefined,
  returnPath: string,
) {
  const router = useRouter();
  const { data: user } = useSession();
  const notYours =
    assigneeId !== undefined && !!user && !mayRecordFor(user, assigneeId);
  useEffect(() => {
    if (notYours) router.replace(returnPath);
  }, [notYours, router, returnPath]);
  return notYours;
}
