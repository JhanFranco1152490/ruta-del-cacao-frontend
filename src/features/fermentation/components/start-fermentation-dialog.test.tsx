import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildFermentation, buildSession } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { pick } from '@/test/search-select';
import { server } from '@/test/server';

import {
  StartFermentationDialog,
  type StartLot,
} from './start-fermentation-dialog';

const NOW = new Date('2026-10-17T09:00:00-05:00');
const USER = 'u1';

const LOT: StartLot = {
  id: 'l1',
  code: '000123-F02-P05-261014-1',
  greenWeightKg: '500.0',
  farm: { code: 'F02', name: 'La Esperanza' },
};

const C01 = { id: 'fc1', name: 'C-01', capacity_kg: '600.0' };
const C02 = { id: 'fc2', name: 'C-02', capacity_kg: '900.0' };

const startOptions = (overrides = {}) => ({
  facilities: [C01],
  responsibles: [
    {
      id: USER,
      full_name: 'Quien registra',
      is_active: true,
      assignable: true,
    },
    { id: 'u2', full_name: 'Luis Rincón', is_active: true, assignable: true },
  ],
  green_weight_kg: '500.0',
  earliest_start_at: '2026-10-14T00:00:00-05:00',
  ...overrides,
});

let optionRequests: number;
let bodies: unknown[];
const onClose = vi.fn<() => void>();
const onSaved = vi.fn<() => void>();

function serve(options = startOptions()) {
  server.use(
    csrfHandler,
    http.get(apiUrl('/api/fermentation/start-options'), () => {
      optionRequests += 1;
      return HttpResponse.json(options);
    }),
  );
}

function answerStart(
  response: () => Response = () =>
    HttpResponse.json(buildFermentation(), { status: 201 }),
) {
  server.use(
    http.post(apiUrl('/api/fermentation'), async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  optionRequests = 0;
  bodies = [];
  serve();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDialog(
  props: Partial<Parameters<typeof StartFermentationDialog>[0]> = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: USER, permissions: [PERMISSIONS.FERMENTATION_MANAGE] }),
  );
  return renderWithProviders(
    <StartFermentationDialog
      facilitiesHref="/infraestructura?finca=f1"
      lot={LOT}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
    { queryClient },
  );
}

// Mientras llegan los cajones el diálogo ya tiene su botón, deshabilitado: se espera al formulario.
const submit = async (name = 'Iniciar') => {
  await screen.findByLabelText('Fecha y hora de inicio');
  await userEvent.click(screen.getByRole('button', { name }));
};

describe('StartFermentationDialog', () => {
  it('names the lot, chooses the only box and the account that registers, and starts now', async () => {
    answerStart();
    renderDialog();

    expect(
      await screen.findByRole('heading', {
        name: `Iniciar fermentación · ${LOT.code}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('500 kg en baba · F02 · La Esperanza'),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Cajón')).toHaveValue('fc1');
    expect(
      screen.getByRole('option', { name: 'C-01 · 600 kg en baba' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha y hora de inicio')).toHaveValue(
      '2026-10-17T09:00',
    );
    expect(screen.getByRole('combobox', { name: 'Responsable' })).toHaveValue(
      'Quien registra',
    );

    await submit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(bodies).toEqual([
      {
        lot_id: 'l1',
        facility_id: 'fc1',
        started_at: expect.stringMatching(/^2026-10-17T09:00:00/),
        responsible_id: USER,
        confirm_over_capacity: false,
      },
    ]);
  });

  it('warns when the lot is over the capacity and starts only after confirming', async () => {
    answerStart();
    renderDialog({ lot: { ...LOT, greenWeightKg: '820.0' } });

    expect(
      await screen.findByRole('option', {
        name: 'C-01 · 600 kg en baba · No alcanza para este lote',
      }),
    ).toBeInTheDocument();
    await submit();

    expect(
      await screen.findByText(
        'El lote (820 kg) supera la capacidad de C-01 (600 kg). ¿Iniciar de todos modos?',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await submit('Iniciar de todos modos');
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(bodies).toEqual([
      expect.objectContaining({ confirm_over_capacity: true }),
    ]);
  });

  it('warns with the capacity the server has when it changed meanwhile', async () => {
    answerStart(() =>
      HttpResponse.json(
        {
          detail: 'El lote supera la capacidad del cajón.',
          code: 'lot_exceeds_capacity',
          fields: {},
          capacity_kg: '450.0',
          green_weight_kg: '500.0',
        },
        { status: 422 },
      ),
    );
    renderDialog();

    await submit();

    expect(
      await screen.findByText(
        'El lote (500 kg) supera la capacidad de C-01 (450 kg). ¿Iniciar de todos modos?',
      ),
    ).toBeInTheDocument();
  });

  it('says when no box is available, links to the infrastructure and does not start', async () => {
    serve(startOptions({ facilities: [] }));
    renderDialog();

    expect(
      await screen.findByText('No hay cajones disponibles en La Esperanza.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver infraestructura' }),
    ).toHaveAttribute('href', '/infraestructura?finca=f1');
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeDisabled();
  });

  it('marks what is missing', async () => {
    serve(startOptions({ facilities: [C01, C02] }));
    renderDialog();

    await screen.findByLabelText('Cajón');
    fireEvent.change(screen.getByLabelText('Fecha y hora de inicio'), {
      target: { value: '' },
    });
    await submit();

    expect(await screen.findAllByText('Campo obligatorio')).toHaveLength(2);
  });

  it('asks for another box when the chosen one was taken meanwhile, and reloads them', async () => {
    answerStart(() =>
      HttpResponse.json(
        { detail: 'Ocupado.', code: 'facility_unavailable', fields: {} },
        { status: 409 },
      ),
    );
    renderDialog();

    await submit();

    expect(
      await screen.findByText('C-01 ya no está disponible. Elige otro.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(optionRequests).toBe(2));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('says when the lot is no longer Generated', async () => {
    answerStart(() =>
      HttpResponse.json(
        {
          detail: 'Otro estado.',
          code: 'lot_invalid_status',
          fields: {},
          current_status: 'fermenting',
        },
        { status: 409 },
      ),
    );
    renderDialog();

    await submit();

    expect(
      await screen.findByText(
        'Este lote ya no está Generado (ahora: En fermentación).',
      ),
    ).toBeInTheDocument();
  });

  describe('correcting the start', () => {
    const fermentation = buildFermentation({ version: 4 });

    it('opens with what the fermentation has and sends only what changed', async () => {
      serve(startOptions({ facilities: [C01, C02] }));
      const patches: unknown[] = [];
      server.use(
        http.patch(apiUrl('/api/fermentation/l1'), async ({ request }) => {
          patches.push(await request.json());
          return HttpResponse.json(fermentation);
        }),
      );
      renderDialog({ fermentation });

      expect(
        await screen.findByRole('heading', {
          name: `Corregir inicio · ${LOT.code}`,
        }),
      ).toBeInTheDocument();
      expect(await screen.findByLabelText('Cajón')).toHaveValue('fc1');
      expect(screen.getByLabelText('Fecha y hora de inicio')).toHaveValue(
        '2026-10-15T07:00',
      );

      await userEvent.selectOptions(screen.getByLabelText('Cajón'), 'fc2');
      await pick('Responsable', 'Luis Rincón');
      await submit('Guardar');

      await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
      expect(patches).toEqual([
        { facility_id: 'fc2', responsible_id: 'u2', expected_version: 4 },
      ]);
    });

    it('closes without sending when nothing changed', async () => {
      renderDialog({ fermentation });

      await screen.findByLabelText('Cajón');
      await submit('Guardar');

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
      expect(onSaved).not.toHaveBeenCalled();
    });
  });
});
