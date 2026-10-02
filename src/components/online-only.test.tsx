import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OnlineOnly } from './online-only';

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

afterEach(() => vi.restoreAllMocks());

describe('OnlineOnly', () => {
  it('shows the section with a connection', () => {
    render(
      <OnlineOnly>
        <p>Productores</p>
      </OnlineOnly>,
    );

    expect(screen.getByText('Productores')).toBeInTheDocument();
  });

  it('explains that the section needs a connection, and comes back with it', () => {
    render(
      <OnlineOnly>
        <p>Productores</p>
      </OnlineOnly>,
    );

    setOnline(false);
    expect(
      screen.getByText('Esta sección necesita conexión'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Productores')).not.toBeInTheDocument();

    setOnline(true);
    expect(screen.getByText('Productores')).toBeInTheDocument();
  });
});
