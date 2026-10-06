const APP_NAME = 'Ruta del Cacao';

// El texto de la pestaña del navegador. Con el productor bajo el que opera la cuenta técnica, para
// distinguir varias pestañas abiertas sin entrar a cada una.
export function pageTitle(section?: string, producer?: string) {
  if (!section) return APP_NAME;
  return [section, producer, APP_NAME].filter(Boolean).join(' · ');
}
