'use client';

import { SegmentedControl } from '@/components/segmented-control';

import { PARAMETER_SECTIONS, type SectionId } from '../parameter-rows';

// Las tarjetas de parámetros como pestañas. Con errores en una que no se ve, su nombre dice cuántos
// hay por revisar, para que no pasen desapercibidos.
export function ParametersTabs({
  section,
  onSection,
  errorCounts = {},
}: {
  section: SectionId;
  onSection: (section: SectionId) => void;
  errorCounts?: Partial<Record<SectionId, number>>;
}) {
  return (
    <SegmentedControl<SectionId>
      fullWidth
      label="Sección de parámetros"
      onChange={onSection}
      options={PARAMETER_SECTIONS.map(({ id, tab }) => ({
        value: id,
        label: errorCounts[id] ? `${tab} (${errorCounts[id]})` : tab,
      }))}
      value={section}
    />
  );
}
