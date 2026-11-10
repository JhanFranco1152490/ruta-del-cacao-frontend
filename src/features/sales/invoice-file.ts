import { MAX_UPLOAD_BYTES } from '@/lib/files/upload-limits';

export const INVOICE_FILE_MESSAGE =
  'Solo se permiten PDF, JPG o PNG de hasta 5 MB.';

// Lo que ofrece el selector de archivos. La extensión va también porque hay teléfonos que no dicen
// el tipo de un PDF descargado.
export const INVOICE_ACCEPT =
  'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';

const TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

// El soporte no se reduce como una foto de evidencia: una factura escaneada debe seguir leyéndose.
// Aquí se adelanta lo que el servidor revisa, que de todos modos mira el contenido del archivo.
export function invoiceFileIssue(
  file: Pick<File, 'name' | 'type' | 'size'>,
): string | null {
  const knownType = file.type
    ? TYPES.has(file.type)
    : EXTENSIONS.test(file.name);
  if (!knownType || file.size > MAX_UPLOAD_BYTES) return INVOICE_FILE_MESSAGE;
  return null;
}

// «284 KB» o «1,2 MB»: el tamaño del archivo, como lo muestra la ficha.
export function fileSizeText(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const megabytes = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return `${String(megabytes).replace('.', ',')} MB`;
}
