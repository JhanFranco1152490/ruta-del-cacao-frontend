import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { OnlineOnly } from './online-only';

function renderSection({ fromDevice = false } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), {
    ...buildSession(),
    ...(fromDevice && { fromDevice: true }),
  });
  return renderWithProviders(
    <OnlineOnly>
      <p>Productores</p>
    </OnlineOnly>,
    { queryClient },
  );
}

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

afterEach(() => vi.restoreAllMocks());

describe('OnlineOnly', () => {
  it('shows the section with a connection', () => {
    renderSection();

    expect(screen.getByText('Productores')).toBeInTheDocument();
  });

  it('explains that the section needs a connection, and comes back with it', () => {
    renderSection();

    setOnline(false);
    expect(
      screen.getByText('Esta sección necesita conexión'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Productores')).not.toBeInTheDocument();

    setOnline(true);
    expect(screen.getByText('Productores')).toBeInTheDocument();
  });

  it('explains it too when the browser reports a network but the server did not answer', () => {
    renderSection({ fromDevice: true });

    expect(
      screen.getByText('Esta sección necesita conexión'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Productores')).not.toBeInTheDocument();
  });
});
