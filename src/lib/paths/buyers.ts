// Ventas lleva al directorio: a registrar un comprador desde su formulario y a la hoja del
// comprador desde la ficha de una venta.
export const BUYERS_PATH = '/compradores';

// La lista con la hoja del comprador abierta (en escritorio, con su fila resaltada).
export const buyerPath = (id: string) =>
  `${BUYERS_PATH}?${new URLSearchParams({ comprador: id })}`;
