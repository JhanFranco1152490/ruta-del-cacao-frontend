import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { useHasPermission } from './use-has-permission';

function PermissionProbe() {
  const allowed = useHasPermission(PERMISSIONS.USERS_CREATE);
  return <button disabled={!allowed}>Crear cuenta</button>;
}

describe('useHasPermission', () => {
  it('denies access until loaded and reacts when permissions are revoked', async () => {
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({ permissions: ['accounts.users_create'] }),
        ),
      ),
    );
    const { queryClient } = renderWithProviders(<PermissionProbe />);
    expect(screen.getByRole('button')).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    await act(async () => {
      queryClient.setQueryData(
        queryKeys.session(),
        buildSession({ permissions: [] }),
      );
    });
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
  });
});
