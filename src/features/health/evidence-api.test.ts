// @vitest-environment node
// El archivo de una foto llega como `Blob` y se guarda en el dispositivo: en jsdom no sobrevive al
// `fetch` de las pruebas ni a IndexedDB, así que esta prueba corre en el entorno `node`.
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { evidenceFileCacheKey, readEvidenceFile } from './evidence-api';

describe('readEvidenceFile', () => {
  it('reads the file through the API and keeps a copy to see it without a network', async () => {
    const userId = `evidence-file-${crypto.randomUUID()}`;
    server.use(
      http.get(
        apiUrl('/api/evidence/e1/file'),
        () =>
          new HttpResponse(new Blob(['foto'], { type: 'image/jpeg' }), {
            headers: { 'Content-Type': 'image/jpeg' },
          }),
      ),
    );

    const online = await readEvidenceFile(userId, 'e1');
    expect(await online.data.text()).toBe('foto');
    const saved = await getOfflineDb(userId).cache.get(
      evidenceFileCacheKey('e1'),
    );
    expect(await (saved?.value as Blob).text()).toBe('foto');

    server.use(
      http.get(apiUrl('/api/evidence/e1/file'), () => HttpResponse.error()),
    );
    const offline = await readEvidenceFile(userId, 'e1');

    expect(offline.savedAt).toBeDefined();
    expect(await offline.data.text()).toBe('foto');
  });
});
