import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadEnv() {
  vi.resetModules();
  return import('./env');
}

afterEach(() => vi.unstubAllEnvs());

describe('API_URL', () => {
  it('drops trailing slashes', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com//');

    expect((await loadEnv()).API_URL).toBe('https://api.example.com');
  });

  it('falls back to localhost outside production when the variable is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);

    expect((await loadEnv()).API_URL).toBe('http://localhost:8000');
  });

  it('falls back to localhost outside production when the variable is empty', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    expect((await loadEnv()).API_URL).toBe('http://localhost:8000');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])(
    'refuses to load in production when the variable is %s',
    async (_case, value) => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_API_URL', value);

      await expect(loadEnv()).rejects.toThrow('NEXT_PUBLIC_API_URL');
    },
  );

  it('loads in production when the variable is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');

    expect((await loadEnv()).API_URL).toBe('https://api.example.com');
  });
});
