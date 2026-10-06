import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, sessionExpired as unauthorized } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { SignedInRedirect } from './signed-in-redirect';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ME = apiUrl('/api/auth/me');

beforeEach(() => vi.clearAllMocks());

describe('SignedInRedirect', () => {
  it('sends a person who already has a session to the entry point', async () => {
    server.use(http.get(ME, () => HttpResponse.json(buildSession())));
    renderWithProviders(<SignedInRedirect />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('leaves the page alone when there is no session', async () => {
    let renewalTried = false;
    server.use(
      http.get(ME, unauthorized),
      http.post(apiUrl('/api/auth/refresh'), () => {
        renewalTried = true;
        return unauthorized();
      }),
    );
    renderWithProviders(<SignedInRedirect />);

    await waitFor(() => expect(renewalTried).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
