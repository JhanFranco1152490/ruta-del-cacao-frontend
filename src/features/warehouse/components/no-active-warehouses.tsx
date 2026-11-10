import Link from 'next/link';

import { FormMessage } from '@/components/form-message';
import { WAREHOUSE_PATH } from '@/lib/paths/warehouse';

// El lote no tiene a dónde ingresar: la finca no tiene bodegas activas. Quien puede registrarlas va
// a la pestaña Bodegas con la finca elegida.
export function NoActiveWarehouses({
  farmId,
  canManage,
  onLeave,
}: {
  farmId: string;
  canManage: boolean;
  onLeave: () => void;
}) {
  return (
    <FormMessage>
      Esta finca no tiene bodegas activas.{' '}
      {canManage && (
        <Link
          className="font-bold underline"
          href={`${WAREHOUSE_PATH}?${new URLSearchParams({ vista: 'bodegas', finca: farmId })}`}
          onClick={onLeave}
        >
          Nueva bodega
        </Link>
      )}
    </FormMessage>
  );
}
