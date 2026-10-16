import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { readThroughCache } from '@/lib/offline/cached-read';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildPestDisease } from '@/test/factories';
import { apiUrl, pestsDiseasesHandler } from '@/test/handlers';
import { server } from '@/test/server';

import {
  ACTIVE_PESTS_DISEASES_CACHE_KEY,
  DUPLICATE_PEST_DISEASE_CODE,
  fetchPestsDiseases,
  patchPestDisease,
  postPestDisease,
} from './pest-api';

describe('fetchPestsDiseases', () => {
  it('asks for the whole catalog without filters', async () => {
    const requests: URLSearchParams[] = [];
    server.use(pestsDiseasesHandler([buildPestDisease()], requests));

    const found = await fetchPestsDiseases();

    expect(found.map(({ name }) => name)).toEqual(['Monilia']);
    expect(requests[0].toString()).toBe('');
  });

  it('asks only for the active ones when told', async () => {
    const requests: URLSearchParams[] = [];
    server.use(pestsDiseasesHandler([], requests));

    await fetchPestsDiseases({ is_active: true });

    expect(requests[0].get('is_active')).toBe('true');
  });

  it('keeps the active ones on the device for the monitoring form', async () => {
    const userId = `pests-${crypto.randomUUID()}`;
    server.use(pestsDiseasesHandler([buildPestDisease()]));

    await readThroughCache(userId, ACTIVE_PESTS_DISEASES_CACHE_KEY, () =>
      fetchPestsDiseases({ is_active: true }),
    );

    const saved = await getOfflineDb(userId).cache.get(
      ACTIVE_PESTS_DISEASES_CACHE_KEY,
    );
    expect(saved?.value).toEqual([buildPestDisease()]);
  });
});

describe('writing the catalog', () => {
  it('registers one and returns it', async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/pests-diseases'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildPestDisease({ id: 'pd-new' }), {
          status: 201,
        });
      }),
    );

    const created = await postPestDisease({
      name: 'Trips',
      kind: 'pest',
      scientific_name: null,
      description: 'Raspan el envés de las hojas.',
    });

    expect(created.id).toBe('pd-new');
    expect(body).toEqual({
      name: 'Trips',
      kind: 'pest',
      scientific_name: null,
      description: 'Raspan el envés de las hojas.',
    });
  });

  it('changes only what is sent, such as the state', async () => {
    let body: unknown;
    server.use(
      http.patch(
        apiUrl('/api/pests-diseases/pd-monilia'),
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(buildPestDisease({ is_active: false }));
        },
      ),
    );

    await patchPestDisease('pd-monilia', { is_active: false });

    expect(body).toEqual({ is_active: false });
  });

  it('lets the repeated name be told apart by its code', async () => {
    server.use(
      http.post(apiUrl('/api/pests-diseases'), () =>
        apiError(409, DUPLICATE_PEST_DISEASE_CODE, 'Ya existe.'),
      ),
    );

    await expect(
      postPestDisease({
        name: 'Monilia',
        kind: 'disease',
        description: 'Repetida.',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'duplicate_pest_disease_name',
    });
  });
});
