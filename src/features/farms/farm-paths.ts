// Ruta fija con el id como parámetro: una sola página que abre sin conexión para cualquier
// finca, incluidas las creadas sin conexión.
export const farmEditPath = (id: string) =>
  `/fincas/editar?${new URLSearchParams({ id })}`;

export const farmDetailPath = (id: string) =>
  `/fincas/detalle?${new URLSearchParams({ id })}`;
