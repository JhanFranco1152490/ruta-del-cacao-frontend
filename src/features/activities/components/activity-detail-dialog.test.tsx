import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildAssignee,
  buildProducer,
  buildSession,
} from '@/test/factories';
import { http, HttpResponse } from 'msw';

import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

import { activityState } from '../activity-state';
import type { AgriculturalActivity } from '../api';
vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { ActivityDetailDialog } from './activity-detail-dialog';

beforeEach(() => {
  resetLocation();
  mockLocation.path = '/actividades';
});

const TODAY = '2026-10-22';

const ALL_PERMISSIONS: string[] = [
  PERMISSIONS.ACTIVITIES_VIEW,
  PERMISSIONS.ACTIVITIES_CHANGE,
  PERMISSIONS.ACTIVITIES_COMPLETE,
  PERMISSIONS.ACTIVITIES_DELETE,
];

function renderDetail(
  overrides: Partial<AgriculturalActivity> = {},
  {
    permissions = ALL_PERMISSIONS,
    withHandlers = true,
    completion = undefined as 'pending' | 'error' | undefined,
  } = {},
) {
  const activity = buildAgriculturalActivity(overrides);
  const handlers = {
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: 'me', permissions }),
  );
  renderWithProviders(
    <ActivityDetailDialog
      item={{ activity, ...activityState(activity, TODAY), completion }}
      today={TODAY}
      {...(withHandlers
        ? { ...handlers, completeHref: '/actividades/realizar?id=a1' }
        : { onClose: handlers.onClose })}
    />,
    { queryClient },
  );
  return handlers;
}

const dialog = () => screen.findByRole('dialog');
// Los botones y el enlace a la pantalla de realización, en el orden en que se ven.
const buttonNames = async () =>
  Array.from((await dialog()).querySelectorAll('button, a'))
    .map((action) => action.textContent?.trim())
    .filter((name) => name !== 'Close');

describe('ActivityDetailDialog', () => {
  it('shows what is scheduled, where and who does it', async () => {
    renderDetail({
      activity_type: 'pruning',
      scheduled_date: TODAY,
      assignee: buildAssignee({ id: 'me' }),
    });

    const detail = await dialog();
    expect(
      within(detail).getByRole('heading', { name: 'Poda' }),
    ).toBeInTheDocument();
    expect(within(detail).getByText('P-03')).toBeInTheDocument();
    expect(within(detail).getByText('Finca de prueba')).toBeInTheDocument();
    expect(within(detail).getByText('Programada')).toBeInTheDocument();
    expect(detail).toHaveTextContent('jueves 22 de octubre de 2026 · hoy');
    expect(detail).toHaveTextContent('Cuenta de prueba (tú)');
  });

  it('offers to delete, edit and complete a scheduled activity', async () => {
    const handlers = renderDetail({ scheduled_date: '2026-10-30' });

    expect(await buttonNames()).toEqual([
      'Eliminar',
      'Editar',
      'Registrar realización',
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(handlers.onEdit).toHaveBeenCalledOnce();
    expect(handlers.onDelete).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('link', { name: 'Registrar realización' }),
    ).toHaveAttribute(
      'href',
      '/actividades/realizar?id=a1&origen=%2Factividades',
    );
  });

  it('remembers the calendar view so the record comes back to it', async () => {
    mockLocation.search = 'vista=semana&finca=f1';
    renderDetail({ scheduled_date: '2026-10-30' });

    expect(
      await screen.findByRole('link', { name: 'Registrar realización' }),
    ).toHaveAttribute(
      'href',
      `/actividades/realizar?id=a1&origen=${encodeURIComponent('/actividades?vista=semana&finca=f1')}`,
    );
  });

  it('tells what to do with a delayed activity and when it becomes overdue', async () => {
    renderDetail({ scheduled_date: '2026-10-20' });

    const detail = await dialog();
    expect(within(detail).getByRole('status')).toHaveTextContent(
      'Retrasada · 2 días. Si la labor no se hizo, reprográmala con Editar. Si ya se hizo, registra su realización.',
    );
    expect(detail).toHaveTextContent(
      'El viernes 23 de octubre · ya no se podrá reprogramar',
    );
    expect(await buttonNames()).toEqual([
      'Eliminar',
      'Editar',
      'Registrar realización',
    ]);
  });

  it('offers only the completion of an overdue activity', async () => {
    renderDetail({ scheduled_date: '2026-10-19' });

    expect(within(await dialog()).getByRole('status')).toHaveTextContent(
      'Vencida · 3 días. Ya no se puede editar, reprogramar ni eliminar.',
    );
    expect(await buttonNames()).toEqual(['Registrar realización']);
  });

  it('shows how a done activity was recorded and offers nothing', async () => {
    renderDetail({
      scheduled_date: '2026-10-13',
      status: 'done',
      done_date: '2026-10-14',
      inputs: [
        {
          input: {
            id: 'in1',
            name: 'Urea 46 %',
            unit: 'kg',
            package_type: 'sack',
            package_size: '50.000',
            is_active: true,
          },
          quantity: '100.000',
        },
      ],
      completed_by: { id: 'u2', full_name: 'Otra cuenta de prueba' },
      completed_at: '2026-10-14T16:12:00-05:00',
    });

    const detail = await dialog();
    expect(within(detail).getByText('Realizada')).toBeInTheDocument();
    expect(detail).toHaveTextContent(
      'Programada paramartes 13 de octubre de 2026',
    );
    expect(detail).toHaveTextContent(
      'Realizada elmiércoles 14 de octubre de 2026',
    );
    expect(within(detail).getByText('Urea 46 %')).toBeInTheDocument();
    expect(within(detail).getByText('100 kg · 2 bultos')).toBeInTheDocument();
    expect(detail).toHaveTextContent(
      'Otra cuenta de prueba · 14 de octubre de 2026, 4:12 p.m.',
    );
    expect(
      within(detail).getByText('Una actividad realizada no se modifica.'),
    ).toBeInTheDocument();
    expect(await buttonNames()).toEqual(['Cerrar']);
  });

  it('says that a done activity used no inputs', async () => {
    renderDetail({
      status: 'done',
      done_date: '2026-10-20',
      completed_by: { id: 'u2', full_name: 'Otra cuenta de prueba' },
      completed_at: '2026-10-20T10:00:00-05:00',
    });

    expect(within(await dialog()).getByText('Sin insumos')).toBeInTheDocument();
  });

  it('hides each action from who lacks its permission', async () => {
    renderDetail(
      { scheduled_date: '2026-10-30' },
      { permissions: [PERMISSIONS.ACTIVITIES_VIEW] },
    );

    expect(await buttonNames()).toEqual(['Cerrar']);
  });

  it('hides an action nobody attends yet', async () => {
    renderDetail({ scheduled_date: '2026-10-30' }, { withHandlers: false });

    expect(await buttonNames()).toEqual(['Cerrar']);
  });

  it('says that a monitoring waits for the health module instead of offering its completion', async () => {
    renderDetail({
      activity_type: 'phytosanitary_monitoring',
      scheduled_date: '2026-10-30',
    });

    expect(
      within(await dialog()).getByText(
        'El registro del monitoreo se habilita con el módulo de sanidad',
      ),
    ).toBeInTheDocument();
    expect(await buttonNames()).toEqual(['Eliminar', 'Editar', 'Cerrar']);
  });

  it('marks an assignee whose account is inactive', async () => {
    renderDetail({ assignee: buildAssignee({ is_active: false }) });

    expect(await dialog()).toHaveTextContent(
      'Cuenta de prueba · Cuenta inactiva',
    );
  });

  it('closes with its button', async () => {
    const handlers = renderDetail({ status: 'done', done_date: '2026-10-20' });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cerrar' }),
    );

    expect(handlers.onClose).toHaveBeenCalledOnce();
  });

  it('says that the completion waits in the phone and offers nothing', async () => {
    renderDetail({ scheduled_date: '2026-10-20' }, { completion: 'pending' });

    const detail = await dialog();
    expect(
      within(detail).getByText('Realizada · pendiente de enviar'),
    ).toBeInTheDocument();
    expect(within(detail).getByRole('status')).toHaveTextContent(
      'Guardada en este teléfono. Se enviará sola cuando haya conexión; puedes seguirla en Registros del dispositivo.',
    );
    // Ya se hizo: ni el aviso de retraso ni cuándo vence.
    expect(detail).not.toHaveTextContent('reprográmala');
    expect(detail).not.toHaveTextContent('Vence');
    expect(await buttonNames()).toEqual(['Cerrar']);
  });

  it('says that the server rejected the completion saved in the phone', async () => {
    renderDetail({ scheduled_date: '2026-10-30' }, { completion: 'error' });

    const detail = await dialog();
    expect(within(detail).getByRole('alert')).toHaveTextContent(
      'El servidor no aceptó la realización guardada en este teléfono. Corrígela o descártala desde Registros del dispositivo.',
    );
    expect(within(detail).getByText('Programada')).toBeInTheDocument();
    expect(await buttonNames()).toEqual([
      'Eliminar',
      'Editar',
      'Registrar realización',
    ]);
  });
});

describe('the producer of the activity', () => {
  function renderAs(user: Parameters<typeof buildSession>[0]) {
    const activity = buildAgriculturalActivity({ producer_id: 'p1' });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.session(), buildSession(user));
    renderWithProviders(
      <ActivityDetailDialog
        item={{ activity, ...activityState(activity, TODAY) }}
        onClose={vi.fn()}
        today={TODAY}
      />,
      { queryClient },
    );
  }

  it('is shown to the technical account, which reaches every producer', async () => {
    server.use(
      http.get(apiUrl('/api/producers/p1'), () =>
        HttpResponse.json(
          buildProducer({
            id: 'p1',
            first_name: 'Ana',
            last_name: 'Gómez',
            member_code: 'S-00012',
          }),
        ),
      ),
    );

    renderAs({
      id: 'me',
      is_superuser: true,
      producer_id: null,
      permissions: [PERMISSIONS.ACTIVITIES_VIEW],
    });

    expect(await screen.findByText('Ana Gómez · S-00012')).toBeInTheDocument();
    expect(screen.getByText('Productor')).toBeInTheDocument();
  });

  it('is not shown to the other accounts, which only see their own', async () => {
    renderAs({ id: 'me', permissions: [PERMISSIONS.ACTIVITIES_VIEW] });

    await dialog();
    expect(screen.queryByText('Productor')).not.toBeInTheDocument();
  });
});
