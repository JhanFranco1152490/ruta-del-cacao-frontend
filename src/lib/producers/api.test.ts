import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProducer, getProducers, updateProducer } from './api';
import type { ProducerInput } from './types';

const validProducer: ProducerInput = {
  document_type: 'CC',
  identity_document: '1234567890',
  first_name: 'Nombre',
  last_name: 'Apellido',
  phone: null,
  email: null,
  municipality_code: '54001',
  joined_on: '2026-01-01',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('producer API', () => {
  it('does not duplicate the slash when the base URL ends with one', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000/');
    vi.resetModules();
    const { getProducer } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'abc' }));
    vi.stubGlobal('fetch', fetchMock);

    await getProducer('abc');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/producers/abc',
    );
  });

  it('uses the collection route with its required trailing slash', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ count: 0, page: 1, page_size: 20, results: [] }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await getProducers({ page: 1, pageSize: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/producers/?page=1&page_size=20',
      expect.any(Object),
    );
  });

  it('obtains a CSRF token before creating a producer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrf_token: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'producer-id' }, 201));
    vi.stubGlobal('fetch', fetchMock);

    await createProducer(validProducer);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/auth/csrf',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/producers/',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-CSRFToken': 'csrf-token' }),
        method: 'POST',
      }),
    );
  });

  it('obtains a fresh CSRF token for each mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrf_token: 'first-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'producer-id' }, 201))
      .mockResolvedValueOnce(jsonResponse({ csrf_token: 'second-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'producer-id' }));
    vi.stubGlobal('fetch', fetchMock);

    await createProducer(validProducer);
    await updateProducer('producer-id', validProducer, 1);

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/auth/csrf',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:8000/api/producers/producer-id',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-CSRFToken': 'second-token' }),
        method: 'PATCH',
      }),
    );
  });
});
