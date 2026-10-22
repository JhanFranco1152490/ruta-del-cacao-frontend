'use client';

import { MapPinned, Ruler, Sprout } from 'lucide-react';

import { StatCell } from '@/components/page-blocks/stat-strip';
import { useSession } from '@/hooks/use-session';
import { formatHectares } from '@/lib/format/hectares';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Farm, useFarms } from '../api';
import { ProducerFarmRows } from './producer-farm-rows';

const sumHectares = (farms: readonly Farm[], field: keyof Farm) =>
  farms.reduce((total, farm) => total + Number(farm[field] ?? 0), 0);

// Las cifras de las fincas del productor: tres celdas de la franja de resumen de su ficha.
export function ProducerFarmStats({ producerId }: { producerId: string }) {
  const { data: user } = useSession();
  const farms = useFarms({ producer: producerId });
  if (!hasPermission(user, PERMISSIONS.FARMS_VIEW) || !farms.isSuccess) {
    return null;
  }
  const results = farms.data.results;
  const total = farms.data.count;
  // Con más fincas de las que trae la primera página las sumas serían de una parte: se dice.
  const partial = total > results.length;
  const area = sumHectares(results, 'area_hectares');
  const allocated = sumHectares(results, 'allocated_area_hectares');
  const percentage = area > 0 ? Math.round((allocated / area) * 100) : 0;
  return (
    <>
      <StatCell icon={MapPinned} label="Fincas" value={String(total)} />
      <StatCell
        icon={Ruler}
        label="Área total"
        note={partial ? `De las primeras ${results.length}` : undefined}
        value={formatHectares(String(area))}
      />
      <StatCell
        icon={Sprout}
        label="En parcelas"
        note={`${percentage} % del área`}
        percentage={percentage}
        value={formatHectares(String(allocated))}
      />
    </>
  );
}

// Las fincas de un productor en su ficha; desde cada una se abre su detalle. Quien solo mira
// productores y no fincas no la ve.
export function ProducerFarmsList({ producerId }: { producerId: string }) {
  const { data: user } = useSession();
  const farms = useFarms({ producer: producerId });
  if (!hasPermission(user, PERMISSIONS.FARMS_VIEW)) return null;
  return (
    <ProducerFarmRows
      canAdd={hasPermission(user, PERMISSIONS.FARMS_ADD)}
      farms={farms}
      producerId={producerId}
    />
  );
}
