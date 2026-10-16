import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildAgriculturalInput,
  buildAssignee,
  buildSession,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  agriculturalInputsHandler,
  apiUrl,
  inputStocksHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { controlQueueId } from '../control-queue';

import { ActivityHealthDetail } from './activity-health-detail';

type Schemas = components['schemas'];

const monitoring = (
  overrides: Partial<Schemas['ActivityMonitoring']> = {},
): Schemas['ActivityMonitoring'] => ({
  sampling_unit: 'trees',
  evaluated_units: 50,
  sampling_method: 'zigzag',
  notes: 'Foco en la zona baja.',
  no_presence: false,
  detections: [
    {
      id: 'd1',
      pest_disease: {
        id: 'monilia',
        name: 'Monilia',
        kind: 'disease',
        is_active: true,
      },
      other_description: null,
      affected_units: 12,
      incidence: '24.00',
      controls: [
        {
          id: 'c1',
          method: 'fruit_removal',
          method_description: null,
          scheduled_date: '2026-10-19',
          state: 'done',
          done_date: '2026-10-19',
        },
      ],
      control_request: null,
    },
    {
      id: 'd2',
      pest_disease: null,
      other_description: 'Hormigas en hojas',
      affected_units: 3,
      incidence: '6.00',
      controls: [],
      control_request: {
        requested_by: { id: 'u2', full_name: 'Luis Mora' },
        requested_at: '2026-10-19T15:20:00Z',
        dismissed_by: null,
        dismissed_at: null,
      },
    },
  ],
  detections_without_control: 1,
  evidence_count: 0,
  ...overrides,
});

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');
let userId: string;

beforeEach(() => {
  userId = `health-detail-${crypto.randomUUID()}`;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(
    agriculturalInputsHandler([
      buildAgriculturalInput({ id: 'copper', name: 'Óxido de cobre' }),
    ]),
    inputStocksHandler([]),
    // El detalle de un monitoreo realizado también pide sus fotos.
    http.get(apiUrl('/api/agricultural-activities/:id/evidence'), () =>
      HttpResponse.json({ results: [] }),
    ),
    activityAssigneesHandler([
      buildAssignee({
        id: 'u-foreman',
        full_name: 'Carlos Rincón',
        all_farms: false,
        farm_ids: ['f1'],
      }),
    ]),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

const SCHEDULER = [
  PERMISSIONS.ACTIVITIES_VIEW,
  PERMISSIONS.ACTIVITIES_ADD,
  PERMISSIONS.ACTIVITIES_COMPLETE,
];

function renderDetail(
  activity: components['schemas']['AgriculturalActivity'],
  permissions: string[] = SCHEDULER,
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(<ActivityHealthDetail activity={activity} />, {
    queryClient,
  });
}

const doneMonitoring = (
  overrides: Partial<components['schemas']['ActivityMonitoring']> = {},
) =>
  buildAgriculturalActivity({
    id: 'm1',
    activity_type: 'phytosanitary_monitoring',
    status: 'done',
    done_date: '2026-10-19',
    monitoring: monitoring(overrides),
  });

describe('ActivityHealthDetail', () => {
  it('shows what was evaluated, each detection with its controls and what is missing', () => {
    renderDetail(doneMonitoring());

    const result = screen.getByRole('region', {
      name: 'Resultado del monitoreo',
    });
    expect(result).toHaveTextContent('Evaluado: 50 árboles · zig-zag');
    const detections = within(result).getByRole('list', {
      name: 'Detecciones',
    });
    expect(detections).toHaveTextContent('Monilia · 12 árboles · 24 %');
    expect(
      within(detections).getByRole('list', { name: 'Controles' }),
    ).toHaveTextContent(
      'Remoción de frutos enfermos · 19 de octubre · Realizado',
    );
    expect(detections).toHaveTextContent(
      'Otra (Hormigas en hojas) · 3 árboles · 6 %',
    );
    expect(
      within(detections).getByText('Control solicitado por Luis Mora · 19 oct'),
    ).toBeVisible();
    expect(result).toHaveTextContent('Observaciones: Foco en la zona baja.');
  });

  it('says that nothing was found in a monitoring without presence', () => {
    renderDetail(
      doneMonitoring({
        no_presence: true,
        detections: [],
        notes: null,
        detections_without_control: 0,
      }),
    );

    expect(
      screen.getByText('Sin presencia de plagas ni enfermedades'),
    ).toBeVisible();
    expect(screen.queryByText(/Observaciones/)).not.toBeInTheDocument();
  });

  it('says what a control attends and opens its monitoring', async () => {
    const onOpenActivity = vi.fn();
    render(
      <ActivityHealthDetail
        activity={buildAgriculturalActivity({
          activity_type: 'phytosanitary_control',
          control_of: {
            detection_id: 'd1',
            monitoring_id: 'm1',
            pest_disease: {
              id: 'monilia',
              name: 'Monilia',
              kind: 'disease',
              is_active: true,
            },
            other_description: null,
            incidence: '24.00',
            sampling_unit: 'pods',
            monitoring_done_date: '2026-10-19',
            method: 'product_application',
            method_description: null,
            planned_input: {
              id: 'copper',
              name: 'Óxido de cobre',
              is_active: true,
            },
            evidence_count: 0,
          },
        })}
        onOpenActivity={onOpenActivity}
      />,
    );

    const section = screen.getByRole('region', {
      name: 'Control fitosanitario',
    });
    expect(section).toHaveTextContent(
      'Atiende: Monilia 24 % de mazorcas · monitoreo del 19 de octubre',
    );
    expect(section).toHaveTextContent('Qué se hace: Aplicación de producto');
    expect(section).toHaveTextContent('Insumo previsto: Óxido de cobre');

    await userEvent.click(
      within(section).getByRole('button', { name: 'Ver el monitoreo' }),
    );
    expect(onOpenActivity).toHaveBeenCalledWith('m1');
  });

  it('adds nothing to another labor', () => {
    const { container } = render(
      <ActivityHealthDetail activity={buildAgriculturalActivity()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('the evidence', () => {
  it('shows its section in a done monitoring', async () => {
    renderDetail(doneMonitoring());
    expect(
      await screen.findByRole('region', { name: 'Evidencia' }),
    ).toBeInTheDocument();
  });

  it('has no section in a control still scheduled', () => {
    renderDetail(
      buildAgriculturalActivity({
        activity_type: 'phytosanitary_control',
        status: 'scheduled',
        control_of: {
          detection_id: 'd1',
          monitoring_id: 'm1',
          pest_disease: null,
          other_description: 'Hormigas en hojas',
          incidence: '6.00',
          sampling_unit: 'trees',
          monitoring_done_date: '2026-10-19',
          method: null,
          method_description: null,
          planned_input: null,
          evidence_count: 0,
        },
      }),
    );

    expect(
      screen.queryByRole('region', { name: 'Evidencia' }),
    ).not.toBeInTheDocument();
  });
});

describe('the actions of a detection', () => {
  const detectionItem = (name: RegExp) =>
    screen
      .getAllByRole('listitem')
      .find((item) => name.test(item.textContent ?? '')) as HTMLElement;

  it('offers who schedules to schedule or record a control, and to dismiss a requested one', () => {
    renderDetail(doneMonitoring());

    const requested = detectionItem(/^Otra \(Hormigas/);
    expect(
      within(requested).getByRole('button', { name: 'Programar control' }),
    ).toBeVisible();
    expect(
      within(requested).getByRole('button', {
        name: 'Registrar control realizado',
      }),
    ).toBeVisible();
    expect(
      within(requested).getByRole('button', { name: 'No requiere control' }),
    ).toBeVisible();
    // Monilia ya tiene su control y nadie pidió nada: no se ofrece descartarla.
    expect(
      within(detectionItem(/^Monilia/)).queryByRole('button', {
        name: 'No requiere control',
      }),
    ).not.toBeInTheDocument();
  });

  it('offers nothing to who cannot schedule', () => {
    renderDetail(doneMonitoring(), [
      PERMISSIONS.ACTIVITIES_VIEW,
      PERMISSIONS.ACTIVITIES_COMPLETE,
    ]);

    expect(
      screen.queryByRole('button', { name: 'Programar control' }),
    ).toBeNull();
  });

  it('schedules a control from a detection through the device queue', async () => {
    renderDetail(doneMonitoring());

    await userEvent.click(
      within(detectionItem(/^Otra \(Hormigas/)).getByRole('button', {
        name: 'Programar control',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Programar control',
    });
    expect(dialog).toHaveTextContent(
      'Atiende: Otra (Hormigas en hojas) 6 % · P-03',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Fecha programada'),
      '2026-10-25',
    );
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Responsable' }),
    );
    await userEvent.click(
      await screen.findByRole('option', { name: 'Carlos Rincón' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Programar control' }),
    );

    expect(
      await screen.findByText('Control fitosanitario programado'),
    ).toBeVisible();
    const [queued] = await getOfflineDb(userId)
      .queue.where('resource')
      .equals('phytosanitary-controls')
      .toArray();
    expect(queued).toMatchObject({
      parentId: 'd2',
      payload: {
        label: 'Otra (Hormigas en hojas) · P-03',
        request: {
          mode: 'scheduled',
          scheduled_date: '2026-10-25',
          assignee_id: 'u-foreman',
        },
      },
    });
    expect(queued.id).toBe(
      controlQueueId(
        (queued.payload as { request: { id: string } }).request.id,
      ),
    );
  });

  it('records a done control, not before the monitoring, saying what was done', async () => {
    renderDetail(doneMonitoring());

    await userEvent.click(
      within(detectionItem(/^Otra \(Hormigas/)).getByRole('button', {
        name: 'Registrar control realizado',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Registrar control realizado',
    });
    const date = within(dialog).getByLabelText('Fecha de aplicación');
    expect(date).toHaveValue('2026-10-22');
    await userEvent.clear(date);
    await userEvent.type(date, '2026-10-18');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Registrar control' }),
    );

    expect(
      await within(dialog).findByText(
        'La fecha no puede ser anterior a la fecha del monitoreo (19 de octubre de 2026)',
      ),
    ).toBeVisible();
    expect(within(dialog).getByText('Indica qué hiciste')).toBeVisible();
    expect(within(dialog).getByText('Elige el responsable')).toBeVisible();
  });

  it('decides that a requested detection needs no control, after confirming', async () => {
    const decided: string[] = [];
    server.use(
      http.post(
        apiUrl('/api/phytosanitary-detections/:id/no-control-needed'),
        ({ params }) => {
          decided.push(String(params.id));
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    renderDetail(doneMonitoring());

    await userEvent.click(
      within(detectionItem(/^Otra \(Hormigas/)).getByRole('button', {
        name: 'No requiere control',
      }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Confirmar',
      }),
    );

    await waitFor(() => expect(decided).toEqual(['d2']));
    expect(
      await screen.findByText('Detección marcada: no requiere control'),
    ).toBeVisible();
  });
});
