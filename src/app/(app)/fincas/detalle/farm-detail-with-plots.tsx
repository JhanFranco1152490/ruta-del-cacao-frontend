'use client';

import { FarmDetailFromQuery } from '@/features/farms/components/farm-detail-from-query';
import { FarmPlotsSection } from '@/features/plots/components/farm-plots-section';

// Aquí se juntan los dos dominios: la finca no conoce las parcelas ni las parcelas importan de
// fincas. Es de cliente porque la sección de parcelas se entrega como función, y una función no
// puede pasar de un componente de servidor a uno de cliente.
export function FarmDetailWithPlots() {
  return (
    <FarmDetailFromQuery
      renderPlots={(farm) => <FarmPlotsSection farm={farm} />}
    />
  );
}
