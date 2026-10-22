'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { InputMovementsScreen } from '@/features/inputs/components/input-movements-screen';
import { useSession } from '@/hooks/use-session';
import { useFarmDetail } from '@/lib/api/farm-detail';
import { LoadingBlock } from '@/components/loading-block';

// Aquí se juntan los dominios: los insumos no leen las fincas, así que la página les pasa la finca
// de la URL.
export function MovementsWithFarm() {
  const params = useSearchParams();
  const inputId = params.get('id');
  const farmId = params.get('finca');
  if (!inputId || !farmId) {
    return (
      <ErrorState message="No se indicó de qué insumo y finca ver los movimientos." />
    );
  }
  return (
    <MovementsOfFarm
      farmId={farmId}
      inputId={inputId}
      key={`${inputId}:${farmId}`}
    />
  );
}

// La finca se lee con copia en el dispositivo: así, sin conexión, la pantalla abre y dice que los
// movimientos necesitan conexión.
function MovementsOfFarm({
  inputId,
  farmId,
}: {
  inputId: string;
  farmId: string;
}) {
  const { data: user } = useSession();
  const farm = useFarmDetail(user?.id, farmId);

  if (farm.isError) {
    return (
      <ErrorState
        message="No fue posible cargar la finca. Revisa tu conexión e inténtalo nuevamente."
        onRetry={() => void farm.refetch()}
      />
    );
  }
  if (!farm.data) {
    return <LoadingBlock className="p-8" label="Cargando" shapes={['h-40']} />;
  }
  const { id, name, is_active } = farm.data.data;
  return (
    <InputMovementsScreen farm={{ id, name, is_active }} inputId={inputId} />
  );
}
