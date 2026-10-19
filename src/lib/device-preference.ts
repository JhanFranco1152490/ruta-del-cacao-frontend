// Una comodidad guardada en este dispositivo (la última parcela o finca elegida). Nunca es
// imprescindible: si el almacenamiento del navegador no está disponible (modo privado, datos
// bloqueados), leer devuelve `null`, guardar no hace nada y la pantalla pregunta como la primera vez.
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function rememberPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento solo se pierde la comodidad.
  }
}
