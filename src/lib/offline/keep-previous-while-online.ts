import { onlineManager } from '@tanstack/react-query';

// `keepPreviousData` para las listas que se leen con copia en el dispositivo: al cambiar de mes, de
// pestaña o de filtro sigue a la vista la lista anterior mientras llega la nueva, pero solo con red.
// Sin ella, la consulta nueva queda en pausa y lo anterior se vería como si fuera lo pedido (las
// ventas de otro mes bajo el nombre del nuevo, con el aviso de copia guardada): sin datos de
// relleno, la pantalla espera la copia de lo que se pidió o pide conexión una vez.
export const keepPreviousWhileOnline = <T>(previous: T | undefined) =>
  onlineManager.isOnline() ? previous : undefined;
