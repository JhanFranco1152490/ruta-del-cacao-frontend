import { describe, expect, it, vi } from 'vitest';

import {
  fitWithin,
  FORMAT_NOT_ALLOWED_MESSAGE,
  MAX_PHOTO_BYTES,
  NOT_PREPARED_MESSAGE,
  preparePhoto,
  type PhotoCodec,
  TOO_LARGE_MESSAGE,
} from './prepare-photo';

describe('fitWithin', () => {
  it('shrinks the longest side of a wide photo to the limit, keeping its shape', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('shrinks the longest side of a tall photo to the limit', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('keeps a photo that already fits', () => {
    expect(fitWithin(1200, 900, 1600)).toEqual({ width: 1200, height: 900 });
  });

  it('rounds to whole pixels and never gives zero', () => {
    expect(fitWithin(4001, 3, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

// Un decodificador y un codificador de mentira: jsdom no tiene canvas.
const codec = (
  size: { width: number; height: number },
  encodedBytes = 300_000,
): PhotoCodec & { encode: ReturnType<typeof vi.fn> } => ({
  decode: vi.fn(async () => ({ ...size, image: 'bitmap' })),
  encode: vi.fn(async () => new Blob([new Uint8Array(encodedBytes)])),
});

const file = (name: string, type: string) =>
  new File([new Uint8Array(10)], name, { type });

describe('preparePhoto', () => {
  it('shrinks a JPG or a PNG photo to 1600 px and saves it as JPG', async () => {
    const fake = codec({ width: 4000, height: 3000 });

    const prepared = await preparePhoto(file('Mazorca.PNG', 'image/png'), fake);

    expect(fake.encode).toHaveBeenCalledWith('bitmap', {
      width: 1600,
      height: 1200,
    });
    expect(prepared).toMatchObject({ ok: true, name: 'Mazorca.jpg' });
  });

  it('encodes again a photo that already fits, so it does not keep its metadata', async () => {
    const fake = codec({ width: 800, height: 600 });

    await preparePhoto(file('foto.jpg', 'image/jpeg'), fake);

    expect(fake.encode).toHaveBeenCalledWith('bitmap', {
      width: 800,
      height: 600,
    });
  });

  it('rejects anything that is not a JPG or a PNG photo, such as a PDF', async () => {
    const fake = codec({ width: 800, height: 600 });

    expect(
      await preparePhoto(file('informe.pdf', 'application/pdf'), fake),
    ).toEqual({ ok: false, message: FORMAT_NOT_ALLOWED_MESSAGE });
    expect(await preparePhoto(file('foto.heic', 'image/heic'), fake)).toEqual({
      ok: false,
      message: FORMAT_NOT_ALLOWED_MESSAGE,
    });
    expect(fake.decode).not.toHaveBeenCalled();
  });

  it('rejects a photo that the phone cannot read as an image', async () => {
    const fake = codec({ width: 800, height: 600 });
    fake.decode = vi.fn(async () => {
      throw new Error('broken');
    });

    expect(await preparePhoto(file('foto.jpg', 'image/jpeg'), fake)).toEqual({
      ok: false,
      message: FORMAT_NOT_ALLOWED_MESSAGE,
    });
  });

  it('says so when the phone cannot write the photo again', async () => {
    const fake = codec({ width: 800, height: 600 });
    fake.encode = vi.fn(async () => {
      throw new Error('encode');
    });

    expect(await preparePhoto(file('foto.jpg', 'image/jpeg'), fake)).toEqual({
      ok: false,
      message: NOT_PREPARED_MESSAGE,
    });
  });

  it('rejects a photo that is still above 5 MB after shrinking it', async () => {
    const fake = codec({ width: 1600, height: 1200 }, MAX_PHOTO_BYTES + 1);

    expect(await preparePhoto(file('foto.jpg', 'image/jpeg'), fake)).toEqual({
      ok: false,
      message: TOO_LARGE_MESSAGE,
    });
  });
});
