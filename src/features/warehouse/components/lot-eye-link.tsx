'use client';

import { LotViewLink } from '@/components/lot-view-link';
import { useHasConnection } from '@/hooks/use-has-connection';

import { OFFLINE_LOT_REASON } from '../warehouse-actions';

// Sin conexión el ojo queda deshabilitado con su motivo: la ficha no guarda copia de los lotes de
// bodega y el enlace llevaría a una página que no abre.
export function LotEyeLink({ code, href }: { code: string; href: string }) {
  const online = useHasConnection();
  return (
    <LotViewLink
      code={code}
      disabledReason={online ? null : OFFLINE_LOT_REASON}
      href={href}
    />
  );
}
