import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { buildDrying, buildSession } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { StartDryingDialog } from './start-drying-dialog';

const NOW = new Date('2026-10-24T10:00:00-05:00');
const lot = {
  id: 'l9',
  code: '000123-F02-P05-261016-1',
  greenWeightKg: '186.0',
  farm: { code: 'F02', name: 'La Esperanza' },
};

const options = (
  facilities = [{ id: 'fc1', name: 'M-01', capacity_kg: '600.0' }],
) =>
  HttpResponse.json({
    facilities,
    responsibles: [
      {
        id: 'u1',
        full_name: 'Quien registra',
        is_active: true,
        assignable: true,
      },
    ],
    entry_moisture_range: { min: '55.0', max: '60.0' },
    earliest_start_at: '2026-10-16T00:00:00-05:00',
  });

const onSaved = vi.fn<() => void>();
const onClose = vi.fn<() => void>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  onSaved.mockClear();
  onClose.mockClear();
  server.use(csrfHandler);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDialog(drying?: ReturnType<typeof buildDrying>) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: 'u1' }));
  return renderWithProviders(
    <StartDryingDialog
      drying={drying}
      facilitiesHref="/infraestructura?finca=f1"
      lot={lot}
      onClose={onClose}
      onSaved={onSaved}
    />,
    { queryClient },
  );
}

describe('StartDryingDialog', () => {
  it('asks to confirm a humidity out of range before sending, and sends the confirmation', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.get(apiUrl('/api/drying/start-options'), () => options()),
      http.post(apiUrl('/api/drying'), async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(buildDrying(), { status: 201 });
      }),
    );
    renderDialog();

    await userEvent.type(
      await screen.findByLabelText('Humedad de entrada (%)'),
      '48',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La humedad de entrada (48,0 %) está fuera del rango esperado (55–60 %).',
    );
    expect(bodies).toEqual([]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Iniciar de todos modos' }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(bodies[0]).toMatchObject({
      lot_id: 'l9',
      facility_id: 'fc1',
      entry_moisture_pct: '48',
      confirm_entry_moisture: true,
    });
  });

  it('sends a humidity in range without asking', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.get(apiUrl('/api/drying/start-options'), () => options()),
      http.post(apiUrl('/api/drying'), async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(buildDrying(), { status: 201 });
      }),
    );
    renderDialog();

    await userEvent.type(
      await screen.findByLabelText('Humedad de entrada (%)'),
      '57,5',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(bodies[0]).toMatchObject({ confirm_entry_moisture: false });
  });

  it('points to the infrastructure when no dryer is available', async () => {
    server.use(
      http.get(apiUrl('/api/drying/start-options'), () => options([])),
    );
    renderDialog();

    expect(
      await screen.findByText(
        'No hay marquesinas disponibles en La Esperanza.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver infraestructura' }),
    ).toHaveAttribute('href', '/infraestructura?finca=f1');
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeDisabled();
  });

  it('opens with what the drying has when correcting its start, and sends only the change', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.get(apiUrl('/api/drying/start-options'), () => options()),
      http.patch(apiUrl('/api/drying/l9'), async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(buildDrying());
      }),
    );
    renderDialog(buildDrying({ entry_moisture_pct: '57.0', version: 4 }));

    const moisture = await screen.findByLabelText('Humedad de entrada (%)');
    expect(moisture).toHaveValue('57,0');
    await userEvent.clear(moisture);
    await userEvent.type(moisture, '58');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(bodies).toEqual([{ entry_moisture_pct: '58', expected_version: 4 }]);
  });

  it('shows a failure to load the dryers', async () => {
    server.use(
      http.get(apiUrl('/api/drying/start-options'), () => HttpResponse.error()),
    );
    renderDialog();

    expect(
      await screen.findByText(
        /No fue posible cargar las marquesinas disponibles/,
      ),
    ).toBeInTheDocument();
  });
});
