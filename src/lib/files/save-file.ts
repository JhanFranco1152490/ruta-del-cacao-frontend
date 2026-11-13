// Cuánto vive el enlace de un archivo descargado: lo suficiente para que el navegador lo guarde o la
// pestaña lo cargue.
const URL_LIFETIME_MS = 60_000;

// Un enlace `blob:` al archivo, que se libera solo después de usarlo.
export function temporaryObjectUrl(blob: Blob) {
  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), URL_LIFETIME_MS);
  return url;
}

// Guarda en el dispositivo un archivo que ya se descargó con la sesión (la sesión viaja en una
// cookie hacia el servidor de la API, así que un enlace directo no serviría).
export function saveFile(blob: Blob, fileName: string) {
  const link = document.createElement('a');
  link.href = temporaryObjectUrl(blob);
  link.download = fileName;
  link.click();
}
