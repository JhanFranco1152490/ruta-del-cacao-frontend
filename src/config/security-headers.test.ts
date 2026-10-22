import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy, securityHeaders } from './security-headers';

const API = 'https://api.example.org';

describe('contentSecurityPolicy', () => {
  it('only lets the app load from its own origin, its API and the map tile hosts', () => {
    const policy = contentSecurityPolicy({ apiUrl: API, isDev: false });

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain(`connect-src 'self' ${API}`);
    // El Service Worker pide los mosaicos con fetch: sin esto el mapa queda en blanco.
    expect(policy).toMatch(
      /connect-src [^;]*https:\/\/tile\.openstreetmap\.org/,
    );
    expect(policy).toMatch(/img-src [^;]*https:\/\/tiles\.stadiamaps\.com/);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('allows code evaluation and websockets only in development', () => {
    const dev = contentSecurityPolicy({ apiUrl: API, isDev: true });
    const prod = contentSecurityPolicy({ apiUrl: API, isDev: false });

    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain('ws:');
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain('ws:');
    expect(prod).toContain('upgrade-insecure-requests');
  });
});

describe('securityHeaders', () => {
  const names = (isDev: boolean) =>
    securityHeaders({ apiUrl: API, isDev }).map(({ key }) => key);

  it('sends the same protections on every response', () => {
    expect(names(false)).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]),
    );
  });

  it('forces https only in production', () => {
    expect(names(false)).toContain('Strict-Transport-Security');
    expect(names(true)).not.toContain('Strict-Transport-Security');
  });
});
