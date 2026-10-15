// Pedir desde fuera que se abra el formulario de programar una actividad en una parcela. La
// tarjeta de una parcela ofrece programar con un botón o, cuando es angosta, con una opción de su
// menú «⋯»; la opción está en el menú (de otro dominio) y el formulario en este, así que se
// avisan por aquí sin que uno importe del otro.
type Listener = (plotId: string) => void;

const listeners = new Set<Listener>();

export const requestSchedule = (plotId: string) =>
  listeners.forEach((listener) => listener(plotId));

export function onScheduleRequest(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
