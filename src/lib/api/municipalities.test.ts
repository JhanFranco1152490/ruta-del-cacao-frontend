import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiError, buildMunicipalities } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { server } from '@/test/server';

import { fetchMunicipalities } from './municipalities';

const CATALOG = apiUrl('/api/catalogs/municipalities');

beforeEach(() => {
  window.localStorage.clear();
});

describe('fetchMunicipalities', () => {
  it('uses the copy saved on the device when there is no connection', async () => {
    server.use(municipalitiesHandler());
    await fetchMunicipalities();

    server.use(http.get(CATALOG, () => HttpResponse.error()));

    expect(await fetchMunicipalities()).toEqual(buildMunicipalities());
  });

  it('fails without connection when no copy was ever saved', async () => {
    server.use(http.get(CATALOG, () => HttpResponse.error()));

    await expect(fetchMunicipalities()).rejects.toThrow();
  });

  it('does not hide an error answered by the server behind the copy', async () => {
    server.use(municipalitiesHandler());
    await fetchMunicipalities();

    server.use(
      http.get(CATALOG, () =>
        apiError(403, 'permission_denied', 'Sin permiso.'),
      ),
    );

    await expect(fetchMunicipalities()).rejects.toMatchObject({
      status: 403,
    });
  });
});
