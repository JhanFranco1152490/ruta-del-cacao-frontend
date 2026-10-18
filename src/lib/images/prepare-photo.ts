// Las fotos de evidencia se preparan en el teléfono antes de guardarlas en la cola: así la subida
// en campo es corta y la cola sin conexión no llena el teléfono. Una foto reducida a 1600 px sigue
// mostrando la mancha en la mazorca y pesa unos cientos de KB.

export const MAX_PHOTO_SIDE = 1600;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const JPEG_QUALITY = 0.85;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png']);

export const FORMAT_NOT_ALLOWED_MESSAGE =
  'Formato no permitido. Puedes adjuntar fotos JPG o PNG';
export const TOO_LARGE_MESSAGE = 'El archivo supera el tamaño máximo de 5 MB';
export const NOT_PREPARED_MESSAGE =
  'No fue posible preparar la foto en este teléfono. Inténtalo con otra.';

// El tamaño que cabe en `max` por su lado más largo, sin cambiar la forma de la foto. Una que ya
// cabe no se agranda.
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type Decoded<Image> = { width: number; height: number; image: Image };

// Cómo se lee y se vuelve a escribir la foto. Se recibe aparte para probar la preparación sin un
// navegador con canvas.
export type PhotoCodec<Image = unknown> = {
  decode: (file: File) => Promise<Decoded<Image>>;
  encode: (
    image: Image,
    size: { width: number; height: number },
  ) => Promise<Blob>;
};

// La orientación se toma de la foto, como la muestra la cámara; al dibujarla en un lienzo nuevo se
// pierden sus metadatos (entre ellos, la ubicación donde se tomó).
export const browserPhotoCodec: PhotoCodec<ImageBitmap> = {
  async decode(file) {
    const image = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
    return { width: image.width, height: image.height, image };
  },
  encode(image, { width, height }) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
    image.close();
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
        'image/jpeg',
        JPEG_QUALITY,
      ),
    );
  },
};

const asJpegName = (name: string) =>
  `${name.replace(/\.[^.]*$/, '') || 'foto'}.jpg`;

export type PreparedPhoto =
  { ok: true; blob: Blob; name: string } | { ok: false; message: string };

// Solo fotos JPG o PNG, reducidas a 1600 px por su lado más largo y guardadas como JPG. Una que el
// teléfono no puede leer como imagen se rechaza como formato no permitido; una que tras reducirla
// sigue pasando de 5 MB, por su tamaño.
export async function preparePhoto(
  file: File,
  codec: PhotoCodec = browserPhotoCodec as PhotoCodec,
): Promise<PreparedPhoto> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { ok: false, message: FORMAT_NOT_ALLOWED_MESSAGE };
  }
  let decoded: Decoded<unknown>;
  try {
    decoded = await codec.decode(file);
  } catch {
    return { ok: false, message: FORMAT_NOT_ALLOWED_MESSAGE };
  }
  const size = fitWithin(decoded.width, decoded.height, MAX_PHOTO_SIDE);
  let blob: Blob;
  try {
    blob = await codec.encode(decoded.image, size);
  } catch {
    return { ok: false, message: NOT_PREPARED_MESSAGE };
  }
  if (blob.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: TOO_LARGE_MESSAGE };
  }
  return { ok: true, blob, name: asJpegName(file.name) };
}
