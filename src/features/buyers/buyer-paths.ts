export const BUYERS_PATH = '/compradores';

// La lista con la hoja del comprador abierta (en escritorio, con su fila resaltada).
export const buyerPath = (id: string) =>
  `${BUYERS_PATH}?${new URLSearchParams({ comprador: id })}`;
