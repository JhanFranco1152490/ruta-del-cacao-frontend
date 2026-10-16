import { createContext, useContext } from 'react';

import type { AgriculturalActivity, Assignee, AssigneeOption } from './api';

export const OUTSIDE_FARM = 'Responsable fuera de la finca';

// Qué advertir del responsable que una actividad de la finca `farmId` ya tiene, para escribirlo
// junto a su nombre; vacío si no hay nada. Una cuenta que no llega en la lista ya no trabaja en
// ninguna finca que quien pregunta alcance, y una que llega sin poder recibir labores perdió el
// permiso: las dos se marcan para que alguien la reasigne. El Productor sigue siendo un
// responsable válido aunque quien pregunta no pueda asignarle labores nuevas. Sin la lista
// (todavía no llega) solo se sabe si la cuenta está inactiva.
export function assigneeNote(
  current: Assignee,
  farmId: string,
  accounts: readonly AssigneeOption[] | undefined,
) {
  if (!current.is_active) return 'Cuenta inactiva';
  if (!accounts) return '';
  const known = accounts.find((account) => account.id === current.id);
  if (!known) return OUTSIDE_FARM;
  if (known.all_farms) return '';
  return known.assignable && known.farm_ids.includes(farmId)
    ? ''
    : OUTSIDE_FARM;
}

// La lista de responsables que ve la cuenta, para que las tarjetas y el detalle de las actividades
// marquen al responsable que ya no es de la finca. La da la pantalla que la consulta; sin ella
// solo se marca la cuenta inactiva.
export const AssigneesContext = createContext<
  readonly AssigneeOption[] | undefined
>(undefined);

export const useAssigneeNote = (activity: AgriculturalActivity) =>
  assigneeNote(
    activity.assignee,
    activity.plot.farm.id,
    useContext(AssigneesContext),
  );
