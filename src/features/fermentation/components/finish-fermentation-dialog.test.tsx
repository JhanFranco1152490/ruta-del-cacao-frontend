import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import {
  buildFermentation,
  buildFermentationTurn,
  buildSession,
} from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { FinishFermentationDialog } from './finish-fermentation-dialog';

// El 20 de octubre a las 10:00; empezó el 15 a las 07:00 y el último volteo fue a las 08:00.
const NOW = new Date('2026-10-20T10:00:00-05:00');
const CODE = '000123-F02-P05-261014-1';

const fermentation = buildFermentation({
  version: 7,
  turns: [
    buildFermentationTurn({ id: 't1', turned_at: '2026-10-17T07:30:00-05:00' }),
    buildFermentationTurn({ id: 't2', turned_at: '2026-10-20T08:00:00-05:00' }),
  ],
});

const onClose = vi.fn<() => void>();
const onSaved = vi.fn<(message: string) => void>();
let bodies: unknown[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  bodies = [];
});

afterEach(() => {
  vi.useRealTimers();
});

function answerFinish(
  response: () => Response = () =>
    HttpResponse.json(
      buildFermentation({
        result: {
          ended_at: '2026-10-20T09:00:00-05:00',
          duration_hours: '122.0',
          turn_count: 2,
          notes: '',
        },
      }),
    ),
) {
  server.use(
    csrfHandler,
    http.post(apiUrl('/api/fermentation/l1/finish'), async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
}

function renderDialog() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: 'u1' }));
  renderWithProviders(
    <FinishFermentationDialog
      fermentation={fermentation}
      onClose={onClose}
      onSaved={onSaved}
    />,
    { queryClient },
  );
}

const endField = () => screen.getByLabelText('Fecha y hora de finalización');
const setEnd = (value: string) =>
  fireEvent.change(endField(), { target: { value } });
const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

describe('FinishFermentationDialog', () => {
  it('names the lot, its box, its turns and its hours, and what will happen', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: `Finalizar fermentación · ${CODE}` }),
    ).toBeInTheDocument();
    expect(screen.getByText('C-01 · 2 volteos · 123 h')).toBeInTheDocument();
    expect(endField()).toHaveValue('2026-10-20T10:00');
    expect(
      screen.getByText(
        'El lote quedará Fermentado, listo para el secado, y el cajón C-01 quedará Disponible.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the duration while the end is chosen', () => {
    renderDialog();

    setEnd('2026-10-20T09:00');

    expect(
      screen.getByText('Duración: 5 días y 2 h (122 h)'),
    ).toBeInTheDocument();
  });

  it('finishes with the end, the notes and the version it read', async () => {
    answerFinish();
    renderDialog();

    setEnd('2026-10-20T09:00');
    await userEvent.type(
      screen.getByLabelText('Observaciones'),
      'Grano con buen color al corte.',
    );
    await submit();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Fermentación finalizada · 5 días y 2 h',
      ),
    );
    expect(bodies).toEqual([
      {
        expected_version: 7,
        ended_at: expect.stringMatching(/^2026-10-20T09:00:00/),
        notes: 'Grano con buen color al corte.',
      },
    ]);
  });

  it('does not finish before the last turn', async () => {
    renderDialog();

    setEnd('2026-10-20T07:00');
    await submit();

    expect(
      await screen.findByText(
        'No puede ser anterior al último volteo (20 oct. 08:00).',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('explains when the fermentation was finished meanwhile', async () => {
    answerFinish(() =>
      HttpResponse.json(
        {
          detail: 'La fermentación ya terminó.',
          code: 'fermentation_not_in_progress',
          fields: {},
        },
        { status: 409 },
      ),
    );
    renderDialog();

    await submit();

    expect(
      await screen.findByText('La fermentación de este lote ya se finalizó.'),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
