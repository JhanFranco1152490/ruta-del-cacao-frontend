import { agreeWith } from '@/lib/facility-labels';

import type { PostharvestFacility } from './api';

export type FacilityActionKind =
  'edit' | 'deactivate' | 'activate' | 'view-lot' | 'delete';

// Una acción con `disabledReason` se ve pero no se toca, y dice por qué.
export type FacilityAction = {
  kind: FacilityActionKind;
  disabledReason?: string;
};

export type FacilityPermissions = {
  canChange: boolean;
  canDelete: boolean;
  canViewLots: boolean;
};

// Lo que ofrece el menú de un elemento. Solo decide qué mostrar: el servidor vuelve a comprobar
// cada regla, porque el elemento pudo ocuparse después de cargar la lista.
export function facilityActions(
  facility: PostharvestFacility,
  { canChange, canDelete, canViewLots }: FacilityPermissions,
): FacilityAction[] {
  const lot = facility.occupied_by?.lot;
  const actions: FacilityAction[] = [];

  if (canChange) {
    actions.push({ kind: 'edit' });
    if (facility.status === 'inactive') {
      actions.push({ kind: 'activate' });
    } else if (lot) {
      const occupied = agreeWith(facility.facility_type, 'ocupad');
      actions.push({
        kind: 'deactivate',
        disabledReason: `Está ${occupied} por ${lot.code}`,
      });
    } else {
      actions.push({ kind: 'deactivate' });
    }
  }
  if (lot && canViewLots) actions.push({ kind: 'view-lot' });
  if (canDelete && !facility.has_records && !lot) {
    actions.push({ kind: 'delete' });
  }
  return actions;
}
