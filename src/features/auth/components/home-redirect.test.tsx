import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { router } from '@/test/router';

import { HomeRedirect } from './home-redirect';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

function renderHome(permissions: string[], { fromDevice = false } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), {
    ...buildSession({ permissions }),
    ...(fromDevice && { fromDevice: true }),
  });
  return renderWithProviders(<HomeRedirect />, { queryClient });
}

beforeEach(() => vi.clearAllMocks());

describe('HomeRedirect', () => {
  it('takes the association to producers', async () => {
    renderHome([PERMISSIONS.PRODUCERS_VIEW, PERMISSIONS.FARMS_VIEW]);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/productores'),
    );
  });

  it('takes a producer to its farms', async () => {
    renderHome([PERMISSIONS.FARMS_VIEW]);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/fincas'));
  });

  it('takes the association to farms when the server does not answer', async () => {
    renderHome([PERMISSIONS.PRODUCERS_VIEW, PERMISSIONS.FARMS_VIEW], {
      fromDevice: true,
    });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/fincas'));
  });

  it('explains when the account has no sections', () => {
    renderHome([]);

    expect(
      screen.getByText('Tu cuenta todavía no tiene secciones asignadas'),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
