import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { PlotHistoryLink } from './plot-history-link';

function renderLink(
  inServer: boolean,
  permissions: string[] = [PERMISSIONS.ACTIVITIES_VIEW],
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ permissions }));
  renderWithProviders(
    <PlotHistoryLink plot={{ id: 'pl1', code: 'P-03', inServer }} />,
    { queryClient },
  );
}

describe('PlotHistoryLink', () => {
  it('opens the history of a plot that is in the server', () => {
    renderLink(true);

    expect(
      screen.getByRole('link', { name: 'Historial fitosanitario de P-03' }),
    ).toHaveAttribute('href', '/sanidad?vista=historial&parcela=pl1');
  });

  it('is not offered for a plot that still waits in the device', () => {
    renderLink(false);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('is not offered to who cannot see activities', () => {
    renderLink(true, [PERMISSIONS.PLOTS_VIEW]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
