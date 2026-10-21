import { SummaryItem, SummaryStrip } from '@/components/summary-strip';
import { FACILITY_TYPE_ORDER, type FacilityType } from '@/lib/facility-labels';

import type { PostharvestFacility } from '../api';
import {
  availabilityText,
  breakdownText,
  inProcessText,
  summarizeFacilities,
} from '../facility-summary';

const TITLES: Record<FacilityType, string> = {
  fermentation_box: 'Cajones disponibles',
  solar_dryer: 'Marquesinas disponibles',
};

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <SummaryItem title={title}>
      <p className="text-xl font-bold text-selva sm:text-2xl">{value}</p>
      {detail && <p className="text-sm">{detail}</p>}
    </SummaryItem>
  );
}

// Lo que hay en la finca con los filtros puestos: cuántos de cada tipo se pueden usar y qué lotes
// están en proceso.
export function FacilitySummaryCards({
  facilities,
}: {
  facilities: readonly PostharvestFacility[];
}) {
  const { byType, inProcess } = summarizeFacilities(facilities);
  return (
    <SummaryStrip label="Resumen de la finca">
      {FACILITY_TYPE_ORDER.map((type) => (
        <SummaryCard
          detail={breakdownText(type, byType[type])}
          key={type}
          title={TITLES[type]}
          value={availabilityText(type, byType[type])}
        />
      ))}
      <SummaryCard
        detail={inProcess.length > 0 ? inProcessText(inProcess) : ''}
        title="Lotes en proceso"
        value={inProcess.length > 0 ? String(inProcess.length) : 'Ninguno'}
      />
    </SummaryStrip>
  );
}
