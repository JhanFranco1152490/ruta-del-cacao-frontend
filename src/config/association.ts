// El nombre de la asociación que firma la página pública de trazabilidad. Cada despliegue lo da con
// `NEXT_PUBLIC_ASSOCIATION_NAME`, que se incrusta al compilar (cambiarlo exige volver a compilar). Sin
// valor se usa un nombre genérico, para que un despliegue sin configurar no salga con el pie vacío.
const DEFAULT_ASSOCIATION_NAME = 'Asociación de productores de cacao';

export const ASSOCIATION_NAME =
  process.env.NEXT_PUBLIC_ASSOCIATION_NAME?.trim() || DEFAULT_ASSOCIATION_NAME;
