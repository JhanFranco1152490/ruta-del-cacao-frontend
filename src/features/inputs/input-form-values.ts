import type { AgriculturalInput } from './api';
import type { InputFormInput } from './schemas';

export const INPUT_SAVED_MESSAGE = 'Insumo guardado con éxito';
export const INPUT_UPDATED_MESSAGE = 'Insumo actualizado';
export const INPUT_ACTIVATED_MESSAGE = 'Insumo activado';
export const INPUT_DEACTIVATED_MESSAGE = 'Insumo desactivado';
export const INPUT_DELETED_MESSAGE = 'Insumo eliminado';
export const STALE_INPUT_MESSAGE =
  'Otra persona cambió este insumo. Revisa los datos actuales antes de guardar.';
export const UNIT_LOCKED_HINT =
  'No se puede cambiar: el insumo ya tiene movimientos o se usó en registros';

// Lo que muestra el formulario de un insumo: vacío para registrar uno nuevo. El contenido llega
// con tres decimales ("3.785", "100.000") y se muestra con coma y sin los ceros que sobran.
export const formValuesOf = (input?: AgriculturalInput): InputFormInput => ({
  name: input?.name ?? '',
  input_type: input?.input_type ?? '',
  unit: input?.unit ?? '',
  package_type: input?.package_type ?? '',
  package_size: input?.package_size
    ? String(Number(input.package_size)).replace('.', ',')
    : '',
});
