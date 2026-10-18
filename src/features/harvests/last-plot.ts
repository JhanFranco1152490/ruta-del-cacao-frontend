// La última parcela en la que la persona registró una cosecha en este dispositivo: el formulario
// la propone al abrirse, porque en campo se vuelve a la misma. Es solo una comodidad: si el
// almacenamiento del navegador no está disponible, el formulario abre sin parcela.
const keyOf = (userId: string) => `harvests:last-plot:${userId}`;

export function readLastPlot(userId: string): string | null {
  try {
    return window.localStorage.getItem(keyOf(userId));
  } catch {
    return null;
  }
}

export function rememberLastPlot(userId: string, plotId: string) {
  try {
    window.localStorage.setItem(keyOf(userId), plotId);
  } catch {
    // Sin almacenamiento solo se pierde la comodidad.
  }
}
