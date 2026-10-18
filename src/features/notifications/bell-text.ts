// El número de la campana: hasta 9, y "9+" desde diez.
export const bellCount = (count: number) => (count > 9 ? '9+' : String(count));

export const bellLabel = (count: number) =>
  count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones';
