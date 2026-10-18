import { hasPermission, PERMISSIONS } from './permissions';

export type ActingUser = {
  id?: string;
  permissions?: readonly string[];
  all_farms?: boolean;
};

// Registra lo hecho en una actividad (su realización, el resultado de un monitoreo, una foto) el
// responsable, quien programa labores (el Capataz/Operario o un rol propio con ese permiso) o quien
// alcanza todas las fincas (el Productor y la cuenta técnica): quien solo registra lo suyo no cierra
// la labor de un compañero. Solo decide qué mostrar; el servidor aplica la misma regla.
export const mayRecordFor = (
  user: ActingUser | null | undefined,
  assigneeId: string | undefined,
) =>
  !!user &&
  (user.all_farms === true ||
    (!!assigneeId && user.id === assigneeId) ||
    hasPermission(user, PERMISSIONS.ACTIVITIES_ADD));
