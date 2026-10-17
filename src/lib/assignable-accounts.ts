// Lo que dice si a una cuenta se le puede dar trabajo en una finca: la regla es la misma para el
// responsable de una actividad y el recolector de una cosecha, y solo cambia el permiso que el
// servidor exige para marcar `assignable`.
export type AssignableAccount = {
  is_active: boolean;
  assignable: boolean;
  all_farms: boolean;
  farm_ids: readonly string[];
};

// A quién se le puede dar trabajo en la finca `farmId`: cuentas activas a las que quien pregunta
// puede asignárselo (`assignable`) y que trabajan en esa finca (entre otras, si atienden varias).
// El Productor y quien trabaja en todas valen para cualquier finca. Sin finca elegida todavía no se
// ofrece nadie que esté limitado a una. El servidor aplica la misma regla al guardar.
export const assignableIn = <Account extends AssignableAccount>(
  accounts: readonly Account[],
  farmId: string,
) =>
  accounts.filter(
    (account) =>
      account.is_active &&
      account.assignable &&
      (account.all_farms || account.farm_ids.includes(farmId)),
  );
