// El código con el que el servidor siembra el rol de Productor.
const PRODUCER_ROLE_CODE = 'producer';

export type AccountKind = {
  producer_id?: string | null;
  is_superuser?: boolean;
  roles?: readonly { code: string | null }[];
};

// Si la cuenta es de un empleado de un productor: tiene productor y algún rol que no es el de
// Productor. Se decide por los roles y no por las fincas: un empleado que trabaja en todas
// (`all_farms`) sigue siendo un empleado. Solo decide qué mostrar; el servidor aplica la misma regla.
export const isEmployee = (user: AccountKind | null | undefined) =>
  !!user &&
  !user.is_superuser &&
  !!user.producer_id &&
  (user.roles ?? []).some(({ code }) => code !== PRODUCER_ROLE_CODE);
