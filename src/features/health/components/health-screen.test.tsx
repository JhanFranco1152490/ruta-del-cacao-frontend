import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { HealthScreen } from './health-screen';

const plot = (id: string, code: string, farm: string) => ({
  id,
  code,
  area_hectares: '2.40',
  is_active: true,
  farm: {
    id: `f-${farm}`,
    name: farm,
    is_active: true,
    producer: { id: 'p1', first_name: 'Ana', last_name: 'Prueba' },
  },
});

describe('HealthScreen', () => {
  it('chooses a plot, grouped by its farm, and opens its history', async () => {
    server.use(
      http.get(apiUrl('/api/plots'), () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            plot('pl1', 'P-01', 'La Esperanza'),
            plot('pl2', 'P-02', 'El Retiro'),
          ],
        }),
      ),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.session(),
      buildSession({ permissions: [PERMISSIONS.ACTIVITIES_VIEW] }),
    );
    renderWithProviders(<HealthScreen />, { queryClient });

    const field = await screen.findByRole('combobox', { name: 'Parcela' });
    await userEvent.click(field);
    await userEvent.type(field, 'retiro');
    await userEvent.click(await screen.findByRole('option', { name: 'P-02' }));

    expect(
      screen.getByRole('link', { name: 'Ver historial fitosanitario' }),
    ).toHaveAttribute('href', '/parcelas/historial-fitosanitario?id=pl2');
  });
});
