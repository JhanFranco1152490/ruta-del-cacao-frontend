import { formatHectares } from '@/lib/format/hectares';
import { plotLabel as placeLabel } from '@/lib/format/place-label';

// Una opción de un campo del formulario. `group` agrupa las que se muestran bajo un mismo
// encabezado (las parcelas de una finca) y `farmId` dice a qué finca pertenece la opción elegida.
export type FormChoice = {
  id: string;
  label: string;
  group?: string;
  farmId?: string;
};

// Una lista que se llena con una lectura: mientras llega o si falla, el campo lo dice.
export type ChoiceList = {
  choices: readonly FormChoice[];
  isLoading: boolean;
  isError: boolean;
  // La lista no cabe en una página: se ofrecen las primeras y el resto se alcanza acotándola.
  truncated?: boolean;
};

export function listHint(
  list: ChoiceList,
  {
    loading,
    failed,
    empty,
    truncated,
  }: { loading: string; failed: string; empty: string; truncated?: string },
) {
  if (list.isLoading) return loading;
  if (list.isError) return failed;
  if (list.choices.length === 0) return empty;
  return list.truncated ? truncated : undefined;
}

export const plotLabel = (plot: {
  code: string;
  name?: string | null;
  areaHectares: string;
}) => `${placeLabel(plot)} · ${formatHectares(plot.areaHectares)}`;
