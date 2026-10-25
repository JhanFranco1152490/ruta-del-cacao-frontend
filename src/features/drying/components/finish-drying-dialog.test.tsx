import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDrying, buildDryingLog } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { FinishDryingDialog } from './finish-drying-dialog';

// El secado empezó el 22 a las 14:00 y la última medición fue el 23 a las 16:00.
const NOW = new Date('2026-10-27T10:00:00-05:00');
const drying = buildDrying({
  version: 4,
  logs: [buildDryingLog({ measured_at: '2026-10-23T16:00:00-05:00' })],
});

const onClose = vi.fn<() => void>();
const onSaved = vi.fn<(message: string) => void>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  onClose.mockClear();
  onSaved.mockClear();
  server.use(csrfHandler);
});

afterEach(() => {
  vi.useRealTimers();
});

const renderDialog = () =>
  renderWithProviders(
    <FinishDryingDialog drying={drying} onClose={onClose} onSaved={onSaved} />,
  );

describe('FinishDryingDialog', () => {
  it('names the lot and the dryer, and says what will happen', async () => {
    renderDialog();

    expect(
      await screen.findByRole('heading', {
        name: 'Finalizar secado · 000123-F02-P05-261014-1',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/la marquesina M-01 quedará Disponible/),
    ).toBeInTheDocument();
    expect(screen.getByText('Meta: 6,5–7,5 %.')).toBeInTheDocument();
  });

  it('computes the yield while the dry weight is typed, and says when the humidity is out of the target', async () => {
    renderDialog();

    await userEvent.type(
      await screen.findByLabelText('Humedad final (%)'),
      '9',
    );
    expect(
      screen.getByText('Meta: 6,5–7,5 %. Fuera de la meta (6,5–7,5 %).'),
    ).toBeInTheDocument();
    // 40 kg secos sobre 120,5 kg en verde.
    await userEvent.type(screen.getByLabelText('Peso seco (kg)'), '40');
    expect(screen.getByText('Rendimiento: 33,2 %')).toBeInTheDocument();
  });

  it('does not accept a dry weight over the green weight, nor an end before the last measurement', async () => {
    renderDialog();

    await userEvent.type(
      await screen.findByLabelText('Humedad final (%)'),
      '7',
    );
    await userEvent.type(screen.getByLabelText('Peso seco (kg)'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(
      await screen.findByText(
        'No puede ser mayor que el peso en verde (120,5 kg).',
      ),
    ).toBeInTheDocument();
  });

  it('finishes with the version it read and reports the yield', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.post(apiUrl('/api/drying/l1/finish'), async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          buildDrying({
            result: {
              ended_at: '2026-10-27T10:00:00-05:00',
              duration_hours: '116.0',
              days: 5,
              total_sun_hours: '30.0',
              final_moisture_pct: '7.0',
              dry_weight_kg: '60.0',
              yield_pct: '32.3',
            },
          }),
        );
      }),
    );
    renderDialog();

    await userEvent.type(
      await screen.findByLabelText('Humedad final (%)'),
      '7',
    );
    await userEvent.type(screen.getByLabelText('Peso seco (kg)'), '60');
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith('Rendimiento calculado: 32,3 %'),
    );
    expect(bodies[0]).toMatchObject({
      expected_version: 4,
      final_moisture_pct: '7',
      dry_weight_kg: '60',
    });
  });

  it('shows what the server rejects', async () => {
    server.use(
      http.post(apiUrl('/api/drying/l1/finish'), () =>
        HttpResponse.json(
          {
            detail: 'Otra persona cambió este secado.',
            code: 'stale_version',
            fields: {},
          },
          { status: 409 },
        ),
      ),
    );
    renderDialog();

    await userEvent.type(
      await screen.findByLabelText('Humedad final (%)'),
      '7',
    );
    await userEvent.type(screen.getByLabelText('Peso seco (kg)'), '60');
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(
      await screen.findByText(/Otra persona cambió este secado/),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
