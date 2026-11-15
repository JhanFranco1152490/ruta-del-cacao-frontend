import type { IndicatorView } from './indicator-view';

// Las macrosecciones de cada panel, que se ven de una en una bajo las cifras. La primera abre.
export const INDICATOR_SECTIONS = {
  producer: [
    { value: 'production', label: 'Producción' },
    { value: 'quality', label: 'Calidad' },
    { value: 'stock-sales', label: 'Bodega y ventas' },
  ],
  association: [
    { value: 'farms', label: 'Fincas' },
    { value: 'quality', label: 'Calidad' },
    { value: 'months', label: 'Por mes' },
  ],
} as const;

export type ProducerSection =
  (typeof INDICATOR_SECTIONS.producer)[number]['value'];
export type AssociationSection =
  (typeof INDICATOR_SECTIONS.association)[number]['value'];

// La macrosección de la dirección si es del panel que se ve y, si no, la primera: `quality` es de los
// dos, pero `farms` no existe en el del productor y una dirección vieja no debe dejar la pantalla vacía.
export function resolveIndicatorSection<View extends IndicatorView>(
  view: View,
  requested: string | null,
): (typeof INDICATOR_SECTIONS)[View][number]['value'] {
  const options = INDICATOR_SECTIONS[view];
  return (options.find(({ value }) => value === requested) ?? options[0]).value;
}
