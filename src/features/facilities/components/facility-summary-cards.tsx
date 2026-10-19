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
    <div className="rounded-(--radius) border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-selva">{value}</p>
      {detail && <p className="text-sm">{detail}</p>}
    </div>
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
    <section
      aria-label="Resumen de la finca"
      className="grid gap-3 sm:grid-cols-3"
    >
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
    </section>
  );
}
