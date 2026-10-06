import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { EditPlotWithFarm } from './edit-plot-with-farm';

// Página fija: la parcela y su finca llegan como parámetros de la URL. Corregir una parcela nueva
// pendiente es parte de registrarla; editar una del servidor es cambiarla: basta con cualquiera
// de los dos permisos para abrir la pantalla.
export default function EditPlotPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.PLOTS_ADD, PERMISSIONS.PLOTS_CHANGE]}>
      <Suspense>
        <EditPlotWithFarm />
      </Suspense>
    </PermissionGate>
  );
}
