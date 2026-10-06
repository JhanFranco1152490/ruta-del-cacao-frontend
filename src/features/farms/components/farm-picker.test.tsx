import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { buildFarm, buildPage } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { FarmPicker } from './farm-picker';

describe('FarmPicker', () => {
  it('lists farms with their municipality and producer, and hands over the one chosen', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/farms'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(
          buildPage([
            buildFarm({ id: 'f1', name: 'La Esperanza' }),
            buildFarm({
              id: 'f2',
              name: 'El Porvenir',
              producer: {
                id: 'p2',
                member_code: 'PROD-000008',
                first_name: 'Luis',
                last_name: 'Gómez',
              },
            }),
          ]),
        );
      }),
    );
    const onPick = vi.fn();
    renderWithProviders(<FarmPicker onPick={onPick} />);

    await userEvent.click(screen.getByLabelText('Finca'));
    await userEvent.click(
      await screen.findByRole('option', {
        name: 'El Porvenir · Cúcuta · Luis Gómez · PROD-000008',
      }),
    );

    expect(onPick).toHaveBeenCalledWith('f2');
  });

  it('searches by what the person types', async () => {
    const searches: (string | null)[] = [];
    server.use(
      http.get(apiUrl('/api/farms'), ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search'));
        return HttpResponse.json(buildPage([]));
      }),
    );
    renderWithProviders(<FarmPicker onPick={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Finca'));
    await userEvent.type(screen.getByLabelText('Finca'), 'Espe');

    await vi.waitFor(() => expect(searches.at(-1)).toBe('Espe'));
    expect(
      await screen.findByText('Ninguna finca coincide con la búsqueda.'),
    ).toBeVisible();
  });
});
