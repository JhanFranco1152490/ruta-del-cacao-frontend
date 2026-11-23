import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiError, sessionExpired } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { apiFetchPublic } from './client';

const PUBLIC_LOT = apiUrl('/api/public/lots/Xq3k9Lm2Pz7tRw1a');

function track(paths: string[]) {
  server.events.on('request:start', ({ request }) => {
    paths.push(new URL(request.url).pathname);
  });
}

describe('apiFetchPublic', () => {
  it('asks without cookies and without a CSRF token', async () => {
    let credentials: RequestCredentials | undefined;
    let csrf: string | null = 'unset';
    server.use(
      http.get(PUBLIC_LOT, ({ request }) => {
        credentials = request.credentials;
        csrf = request.headers.get('x-csrftoken');
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(
      apiFetchPublic('/api/public/lots/Xq3k9Lm2Pz7tRw1a'),
    ).resolves.toEqual({ ok: true });
    expect(credentials).toBe('omit');
    expect(csrf).toBeNull();
  });

  it('never tries to renew the session on a 401', async () => {
    const paths: string[] = [];
    track(paths);
    server.use(http.get(PUBLIC_LOT, () => sessionExpired()));
    await expect(
      apiFetchPublic('/api/public/lots/Xq3k9Lm2Pz7tRw1a'),
    ).rejects.toMatchObject({ status: 401 });
    expect(paths).toEqual(['/api/public/lots/Xq3k9Lm2Pz7tRw1a']);
    server.events.removeAllListeners();
  });

  it('raises the API error of a missing code', async () => {
    server.use(
      http.get(PUBLIC_LOT, () => apiError(404, 'not_found', 'No encontrado.')),
    );
    await expect(
      apiFetchPublic('/api/public/lots/Xq3k9Lm2Pz7tRw1a'),
    ).rejects.toMatchObject({ status: 404, code: 'not_found' });
  });
});
