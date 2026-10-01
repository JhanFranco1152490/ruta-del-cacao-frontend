// Campos de captura en campo: más altos, para usarse con guantes o con el dedo. El borde y la
// letra son los de los demás campos; 16 px como mínimo para que el iPhone no acerque la
// pantalla al tocarlos. Se aplican sobre el estilo base de TextField y SelectField.
export const CAPTURE_FIELD_CLASS =
  'h-[var(--control-h-field)] rounded-(--radius-field) text-base';

// Botones del formulario de captura (Capturar GPS, Guardar): 48 px de alto, cómodos al tacto
// sin verse toscos. Se usan con el tamaño `office` del botón base.
export const CAPTURE_BUTTON_CLASS =
  'h-12 w-full rounded-(--radius-field) px-5 text-base sm:w-auto';
