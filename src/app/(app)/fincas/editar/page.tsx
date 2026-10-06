import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { FarmEditorFromQuery } from '@/features/farms/components/farm-editor-from-query';
import { PERMISSIONS } from '@/lib/permissions';

// Página fija: el id llega como parámetro de la URL y lo lee el navegador, así que la misma
// página guardada abre sin conexión cualquier finca. Leer `searchParams` en el servidor la haría
// dinámica.
export default function EditFarmPage() {
  // Corregir una finca nueva pendiente es parte de registrarla; editar una del servidor es
  // cambiarla: basta con cualquiera de los dos permisos para abrir la pantalla.
  return (
    <PermissionGate anyOf={[PERMISSIONS.FARMS_ADD, PERMISSIONS.FARMS_CHANGE]}>
      <Suspense>
        <FarmEditorFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
