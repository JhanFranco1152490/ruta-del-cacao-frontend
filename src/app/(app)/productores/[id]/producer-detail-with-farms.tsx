'use client';

import {
  ProducerFarmStats,
  ProducerFarmsList,
} from '@/features/farms/components/producer-farms-section';
import { ProducerDetailScreen } from '@/features/producers/components/producer-detail-screen';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Aquí se juntan los dominios: la ficha del productor no conoce las fincas y las fincas no importan
// de productores. Es de cliente porque la sección se entrega como función. Quien no puede ver fincas
// no recibe la sección, y la ficha conserva su forma de siempre.
export function ProducerDetailWithFarms({ id }: { id: string }) {
  const { data: user } = useSession();
  const canSeeFarms = hasPermission(user, PERMISSIONS.FARMS_VIEW);
  return (
    <ProducerDetailScreen
      id={id}
      renderFarms={
        canSeeFarms
          ? (producerId) => ({
              stats: <ProducerFarmStats producerId={producerId} />,
              list: <ProducerFarmsList producerId={producerId} />,
            })
          : undefined
      }
    />
  );
}
