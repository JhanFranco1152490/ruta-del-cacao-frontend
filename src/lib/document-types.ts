import type { components } from '@/lib/api/schema';

export type DocumentType = components['schemas']['DocumentTypeEnum'];

// El Record obliga a listar todos los valores del API: si el backend agrega un tipo,
// TypeScript falla aquí y no en producción.
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PPT: 'Permiso por Protección Temporal',
  NIT: 'Número de Identificación Tributaria',
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as [
  DocumentType,
  ...DocumentType[],
];
