import { preparePhoto } from '@/lib/images/prepare-photo';

export const MAX_PHOTOS = 5;
export const LIMIT_REACHED_MESSAGE = 'Ya tiene 5 fotos, el máximo';

// Una foto lista para guardar en la cola: reducida, con el `id` que la identifica aunque se reenvíe
// y la hora en que se tomó.
export type SelectedPhoto = {
  id: string;
  blob: Blob;
  fileName: string;
  capturedAt: string;
};

// Las fotos que se agregan de las elegidas: se preparan una por una, hasta completar las cinco
// contando las que ya hay (`already`). Lo que no se pudo agregar se dice una vez por motivo.
export async function selectPhotos(
  files: readonly File[],
  {
    already,
    prepare = preparePhoto,
    newId = () => crypto.randomUUID(),
  }: {
    already: number;
    prepare?: typeof preparePhoto;
    newId?: () => string;
  },
): Promise<{ photos: SelectedPhoto[]; errors: string[] }> {
  const room = Math.max(0, MAX_PHOTOS - already);
  const errors = new Set<string>();
  if (files.length > room) errors.add(LIMIT_REACHED_MESSAGE);
  const photos: SelectedPhoto[] = [];
  for (const file of files.slice(0, room)) {
    const prepared = await prepare(file);
    if (!prepared.ok) {
      errors.add(prepared.message);
      continue;
    }
    photos.push({
      id: newId(),
      blob: prepared.blob,
      fileName: prepared.name,
      // La cámara marca la foto al tomarla; una de la galería trae su fecha.
      capturedAt: new Date(file.lastModified).toISOString(),
    });
  }
  return { photos, errors: [...errors] };
}
