import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { buildFermentation } from '@/test/factories';

import { getOfflineDb } from './db';
import {
  findLotInPostharvestCopies,
  readWithPostharvestCopy,
} from './postharvest-copies';

const inLot = (lotId: string) =>
  buildFermentation({ lot: { ...buildFermentation().lot, id: lotId } });

let userId: string;

const save = (key: string, value: unknown[], fetchedAt = 1_760_000_000_000) =>
  getOfflineDb(userId).cache.put({ key, value, fetchedAt });

beforeEach(() => {
  userId = `postharvest-copies-${crypto.randomUUID()}`;
});

describe('findLotInPostharvestCopies', () => {
  it('finds the lot in the copy of the fermentations, with the date of the copy', async () => {
    await save('fermentation', [inLot('l1'), inLot('l2')]);

    expect(await findLotInPostharvestCopies(userId, 'l2')).toEqual({
      kind: 'fermentation',
      process: inLot('l2'),
      savedAt: 1_760_000_000_000,
    });
  });

  it('also looks in the copies the technical account keeps for each producer', async () => {
    await save('fermentation:producer:p2', [inLot('l7')]);

    expect(
      (await findLotInPostharvestCopies(userId, 'l7'))?.process.lot.id,
    ).toBe('l7');
  });

  it('finds nothing for a lot that is in no copy, or in another kind of copy', async () => {
    await save('fermentation', [inLot('l1')]);
    await save('postharvest-facilities', [{ lot: { id: 'l9' } }]);

    expect(await findLotInPostharvestCopies(userId, 'l9')).toBeNull();
  });
});

describe('readWithPostharvestCopy', () => {
  const pickCode = ({ process }: { process: { lot: { code: string } } }) =>
    process.lot.code;

  it('reads from the network when there is an answer', async () => {
    expect(
      await readWithPostharvestCopy(userId, 'l1', async () => 'red', pickCode),
    ).toEqual({ data: 'red' });
  });

  it('uses the copy without an answer from the server', async () => {
    await save('fermentation', [inLot('l1')]);

    expect(
      await readWithPostharvestCopy(
        userId,
        'l1',
        () => Promise.reject(new TypeError('Failed to fetch')),
        pickCode,
      ),
    ).toEqual({ data: inLot('l1').lot.code, savedAt: 1_760_000_000_000 });
  });

  it('does not use the copy for an error of the API, nor without a copy', async () => {
    await save('fermentation', [inLot('l1')]);
    const forbidden = new ApiError(403, {
      detail: 'No.',
      code: 'permission_denied',
      fields: {},
    });

    await expect(
      readWithPostharvestCopy(
        userId,
        'l1',
        () => Promise.reject(forbidden),
        pickCode,
      ),
    ).rejects.toBe(forbidden);
    await expect(
      readWithPostharvestCopy(
        userId,
        'l9',
        () => Promise.reject(new TypeError('Failed to fetch')),
        pickCode,
      ),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
