import { endSentence } from '@/lib/format/sentence';

export const BUYER_CREATED_MESSAGE = 'Comprador registrado';
export const BUYER_UPDATED_MESSAGE = 'Comprador actualizado';
export const BUYER_DEACTIVATED_MESSAGE = 'Comprador desactivado';
export const BUYER_ACTIVATED_MESSAGE = 'Comprador activado';
export const BUYER_DELETED_MESSAGE = 'Comprador eliminado';

export const BUYER_FORM_HINT = 'Quedará disponible para registrar ventas.';
export const BUYER_NAME_HINT = 'Razón social o nombre con que lo conocen.';
export const BUYER_DOCUMENT_HINT =
  'Solo números, sin el dígito de verificación.';
export const BUYER_CONTACT_HINT = 'Al menos un teléfono o un correo.';

export const STALE_BUYER_MESSAGE =
  'Otra persona cambió este comprador. Revisa los datos actuales antes de guardar.';
export const SAVE_FAILED_MESSAGE =
  'No se pudo guardar el comprador. Inténtalo de nuevo.';
export const BUYER_NEEDS_CONNECTION =
  'Registrar o cambiar un comprador necesita conexión.';
export const BUYER_HAS_RECORDS_REASON =
  'No se puede eliminar: tiene ventas registradas.';

export const SIMILAR_NAME_MESSAGE =
  'Ya tienes un comprador llamado así, con otro documento.';

// El servidor no repite el nombre en su mensaje: la interfaz lo arma con el que ya tiene el
// documento, que es del mismo productor. Muchas razones sociales ya terminan en punto («S.A.S.»).
export const duplicateDocumentMessage = (name: string, isActive: boolean) =>
  isActive
    ? `Ya tienes registrado este documento: ${endSentence(name)}`
    : `Ya tienes registrado este documento: ${name}, que está inactivo.`;

export const deactivateTitle = (name: string) => `¿Desactivar a ${name}?`;
export const DEACTIVATE_TEXT =
  'Dejará de ofrecerse al registrar ventas. Sus ventas no cambian. Puedes activarlo de nuevo cuando quieras.';
export const activateTitle = (name: string) => `¿Activar a ${name}?`;
export const ACTIVATE_TEXT = 'Volverá a ofrecerse al registrar ventas.';
export const deleteTitle = (name: string) => `¿Eliminar a ${name}?`;
// La advertencia de eliminar va en dos partes: qué se pierde y, con el ícono de advertencia, que no
// se deshace y qué conviene en su lugar.
export const DELETE_TEXT =
  'Se borrarán sus datos y ya no podrás consultar su historial de cambios.';
export const DELETE_WARNING =
  'Esta acción no se puede deshacer. Si solo dejó de comprarte, mejor desactívalo.';
export const STALE_CHANGE_MESSAGE =
  'Otra persona cambió este comprador mientras tanto. Cierra y revisa sus datos actuales antes de intentarlo de nuevo.';
