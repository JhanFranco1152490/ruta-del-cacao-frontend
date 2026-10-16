import { describe, expect, it, vi } from 'vitest';

import type { PreparedPhoto } from '@/lib/images/prepare-photo';

import {
  LIMIT_REACHED_MESSAGE,
  MAX_PHOTOS,
  selectPhotos,
} from './photo-selection';

const file = (
  name: string,
  lastModified = Date.parse('2026-10-19T15:20:00Z'),
) => new File([new Uint8Array(4)], name, { type: 'image/jpeg', lastModified });

const prepareAll = vi.fn(async (photo: File): Promise<PreparedPhoto> =>
  photo.name.endsWith('.pdf')
    ? {
        ok: false,
        message: 'Formato no permitido. Puedes adjuntar fotos JPG o PNG',
      }
    : { ok: true, blob: new Blob(['x']), name: photo.name },
);

let ids = 0;
const options = (already = 0) => ({
  already,
  prepare: prepareAll,
  newId: () => `p${(ids += 1)}`,
});

describe('selectPhotos', () => {
  it('prepares each chosen photo with its own id and the time it was taken', async () => {
    ids = 0;
    const { photos, errors } = await selectPhotos(
      [file('a.jpg'), file('b.jpg')],
      options(),
    );

    expect(errors).toEqual([]);
    expect(photos).toEqual([
      expect.objectContaining({
        id: 'p1',
        fileName: 'a.jpg',
        capturedAt: '2026-10-19T15:20:00.000Z',
      }),
      expect.objectContaining({ id: 'p2', fileName: 'b.jpg' }),
    ]);
  });

  it('says once why the rejected ones were not added, and keeps the others', async () => {
    const { photos, errors } = await selectPhotos(
      [file('a.pdf'), file('b.pdf'), file('c.jpg')],
      options(),
    );

    expect(photos.map(({ fileName }) => fileName)).toEqual(['c.jpg']);
    expect(errors).toEqual([
      'Formato no permitido. Puedes adjuntar fotos JPG o PNG',
    ]);
  });

  it('adds only up to five photos counting the ones already there', async () => {
    const { photos, errors } = await selectPhotos(
      [file('a.jpg'), file('b.jpg'), file('c.jpg')],
      options(MAX_PHOTOS - 2),
    );

    expect(photos).toHaveLength(2);
    expect(errors).toEqual([LIMIT_REACHED_MESSAGE]);
  });

  it('adds nothing when there are already five', async () => {
    prepareAll.mockClear();

    const { photos, errors } = await selectPhotos(
      [file('a.jpg')],
      options(MAX_PHOTOS),
    );

    expect(photos).toEqual([]);
    expect(errors).toEqual([LIMIT_REACHED_MESSAGE]);
    expect(prepareAll).not.toHaveBeenCalled();
  });
});
