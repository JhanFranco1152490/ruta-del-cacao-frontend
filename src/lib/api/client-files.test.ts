// @vitest-environment node
// Con archivos, el `fetch` de las pruebas tiene que recibir el `Blob` y el `FormData` que entiende,
// como en el navegador. Los de jsdom son otros objetos, y ese `fetch` los mandaría como texto.
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiError, sessionExpired as expired } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { apiFetch, apiFetchBlob, apiFetchFile } from './client';
import { ApiError } from './errors';

const REFRESH = apiUrl('/api/auth/refresh');
const EVIDENCE = apiUrl('/api/agricultural-activities/a1/evidence');
const EVIDENCE_FILE = apiUrl('/api/evidence/e1/file');
const REPORT_FILE = apiUrl('/api/reports/producer/export');

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

describe('apiFetchFile', () => {
  it('returns the file with the name the server gives it', async () => {
    let accept: string | null = null;
    server.use(
      http.get(REPORT_FILE, ({ request }) => {
        accept = request.headers.get('accept');
        return new HttpResponse('a,b', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition':
              'attachment; filename="reporte-produccion-2026-11-13.csv"',
          },
        });
      }),
    );

    const file = await apiFetchFile('/api/reports/producer/export?file=csv');

    expect(file.fileName).toBe('reporte-produccion-2026-11-13.csv');
    expect(await file.blob.text()).toBe('a,b');
    expect(accept).toContain('text/csv');
    expect(accept).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(accept).toContain('application/json');
  });

  it('reads a name written with its encoding', async () => {
    server.use(
      http.get(
        REPORT_FILE,
        () =>
          new HttpResponse('x', {
            headers: {
              'Content-Disposition':
                "attachment; filename*=UTF-8''reporte-producci%C3%B3n.pdf",
            },
          }),
      ),
    );

    const file = await apiFetchFile('/api/reports/producer/export');

    expect(file.fileName).toBe('reporte-producción.pdf');
  });

  // Desde otro origen el navegador oculta el encabezado si la API no lo expone.
  it('says there is no name when the header does not arrive', async () => {
    server.use(http.get(REPORT_FILE, () => new HttpResponse('x')));

    const file = await apiFetchFile('/api/reports/producer/export');

    expect(file.fileName).toBeNull();
  });

  it('turns an error of the export into an ApiError, not a file', async () => {
    server.use(
      http.get(REPORT_FILE, () =>
        apiError(
          400,
          'report_empty',
          'El reporte no tiene resultados para exportar.',
        ),
      ),
    );

    await expect(
      apiFetchFile('/api/reports/producer/export'),
    ).rejects.toMatchObject({ status: 400, code: 'report_empty' });
  });
});
