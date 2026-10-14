import { SegmentedControl } from '@/components/segmented-control';

import type { BaseLayerKind } from './base-layers';

const OPTIONS: readonly { value: BaseLayerKind; label: string }[] = [
  { value: 'map', label: 'Mapa' },
  { value: 'satellite', label: 'Satélite' },
];

// Parte de los controles propios del mapa: elegir el mapa base.
export function BaseLayerToggle({
  value,
  onChange,
  compact = false,
}: {
  value: BaseLayerKind;
  onChange: (value: BaseLayerKind) => void;
  // Para ponerlo sobre el mapa: más bajo, con la misma altura que los botones de al lado.
  compact?: boolean;
}) {
  return (
    <SegmentedControl
      compact={compact}
      label="Mapa base"
      onChange={onChange}
      options={OPTIONS}
      value={value}
    />
  );
}
