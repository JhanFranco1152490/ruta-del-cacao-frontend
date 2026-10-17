// @vitest-environment node
// Con archivos, el `fetch` de las pruebas tiene que recibir el `Blob` y el `FormData` que entiende,
// como en el navegador. Los de jsdom son otros objetos, y ese `fetch` los mandaría como texto.
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiError, sessionExpired as expired } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { apiFetch, apiFetchBlob } from './client';
import { ApiError } from './errors';

const REFRESH = apiUrl('/api/auth/refresh');
const EVIDENCE = apiUrl('/api/agricultural-activities/a1/evidence');
const EVIDENCE_FILE = apiUrl('/api/evidence/e1/file');

describe('apiFetch with form data', () => {
  it('sends the form as multipart with the CSRF token, not as JSON', async () => {
    let seen:
      | { csrf: string | null; type: string | null; id: unknown; file: unknown }
      | undefined;
    server.use(
      http.post(EVIDENCE, async ({ request }) => {
        const form = await request.formData();
        const file = form.get('file');
        seen = {
          csrf: request.headers.get('x-csrftoken'),
          type: request.headers.get('content-type'),
          id: form.get('id'),
          file: file instanceof Blob ? await file.text() : file,
        };
        return HttpResponse.json({ id: 'e1' }, { status: 201 });
      }),
    );
    const form = new FormData();
    form.set('id', 'e1');
    form.set('file', new Blob(['foto'], { type: 'image/jpeg' }), 'foto.jpg');

    await expect(
      apiFetch('/api/agricultural-activities/a1/evidence', {
        method: 'POST',
        body: form,
      }),
    ).resolves.toEqual({ id: 'e1' });
    // El navegador pone el tipo con el separador de las partes; uno fijo lo rompería.
    expect(seen?.type).toMatch(/^multipart\/form-data; boundary=/);
    expect(seen).toMatchObject({ csrf: 'test-csrf', id: 'e1', file: 'foto' });
  });
});

describe('apiFetchBlob', () => {
  it('returns the file as it came, with its type', async () => {
    let accept: string | null = null;
    server.use(
      http.get(EVIDENCE_FILE, ({ request }) => {
        accept = request.headers.get('accept');
        return new HttpResponse(new Blob(['foto'], { type: 'image/png' }), {
          headers: { 'Content-Type': 'image/png' },
        });
      }),
    );

    const file = await apiFetchBlob('/api/evidence/e1/file');

    expect(file.type).toBe('image/png');
    expect(await file.text()).toBe('foto');
    expect(accept).toContain('image/*');
    expect(accept).toContain('application/json');
  });

  it('renews the session once on 401 and asks again', async () => {
    const order: string[] = [];
    server.use(
      http.post(REFRESH, () => {
        order.push('refresh');
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(EVIDENCE_FILE, () => {
        order.push('file');
        return order.length === 1
          ? expired()
          : new HttpResponse(new Blob(['foto'], { type: 'image/jpeg' }), {
              headers: { 'Content-Type': 'image/jpeg' },
            });
      }),
    );

    const file = await apiFetchBlob('/api/evidence/e1/file');

    expect(await file.text()).toBe('foto');
    expect(order).toEqual(['file', 'refresh', 'file']);
  });

  it('turns the uniform error body into an ApiError', async () => {
    server.use(
      http.get(EVIDENCE_FILE, () =>
        apiError(404, 'not_found', 'No encontrado.'),
      ),
    );

    const failure = apiFetchBlob('/api/evidence/e1/file');

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
    });
  });
});
