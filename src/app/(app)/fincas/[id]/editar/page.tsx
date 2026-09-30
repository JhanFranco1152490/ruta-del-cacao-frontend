import { FarmAccessGate } from '@/features/farms/components/farm-access-gate';
import { FarmEditorScreen } from '@/features/farms/components/farm-editor-screen';
import { PERMISSIONS } from '@/lib/permissions';

export default async function EditFarmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Corregir una finca nueva pendiente es parte de registrarla; editar una del servidor es
  // cambiarla: basta con cualquiera de los dos permisos para abrir la pantalla.
  return (
    <FarmAccessGate anyOf={[PERMISSIONS.FARMS_ADD, PERMISSIONS.FARMS_CHANGE]}>
      <FarmEditorScreen id={id} />
    </FarmAccessGate>
  );
}
