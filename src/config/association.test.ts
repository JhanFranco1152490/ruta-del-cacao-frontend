import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadName() {
  vi.resetModules();
  return (await import('./association')).ASSOCIATION_NAME;
}

describe('ASSOCIATION_NAME', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is the name the environment gives', async () => {
    vi.stubEnv('NEXT_PUBLIC_ASSOCIATION_NAME', 'Asociación de Prueba');
    expect(await loadName()).toBe('Asociación de Prueba');
  });

  it('ignores the spaces around the name', async () => {
    vi.stubEnv('NEXT_PUBLIC_ASSOCIATION_NAME', '  Asociación de Prueba  ');
    expect(await loadName()).toBe('Asociación de Prueba');
  });

  it.each([[''], ['   ']])(
    'falls back to a generic name when the variable is empty (%j)',
    async (value) => {
      vi.stubEnv('NEXT_PUBLIC_ASSOCIATION_NAME', value);
      expect(await loadName()).toBe('Asociación de productores de cacao');
    },
  );

  it('falls back to a generic name when the variable is not defined', async () => {
    vi.stubEnv('NEXT_PUBLIC_ASSOCIATION_NAME', undefined);
    expect(await loadName()).toBe('Asociación de productores de cacao');
  });
});
