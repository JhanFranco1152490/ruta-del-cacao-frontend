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
}: {
  value: BaseLayerKind;
  onChange: (value: BaseLayerKind) => void;
}) {
  return (
    <SegmentedControl
      label="Mapa base"
      onChange={onChange}
      options={OPTIONS}
      value={value}
    />
  );
}
