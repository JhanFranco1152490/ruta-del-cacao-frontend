import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildAssignee,
  buildSession,
} from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { activityState } from '../activity-state';
import type { AgriculturalActivity } from '../api';
import { ActivityDetailDialog } from './activity-detail-dialog';

const TODAY = '2026-10-22';

const ALL_PERMISSIONS: string[] = [
  PERMISSIONS.ACTIVITIES_VIEW,
  PERMISSIONS.ACTIVITIES_CHANGE,
  PERMISSIONS.ACTIVITIES_COMPLETE,
  PERMISSIONS.ACTIVITIES_DELETE,
];

function renderDetail(
  overrides: Partial<AgriculturalActivity> = {},
  { permissions = ALL_PERMISSIONS, withHandlers = true } = {},
) {
  const activity = buildAgriculturalActivity(overrides);
  const handlers = {
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onComplete: vi.fn(),
    onDelete: vi.fn(),
  };
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: 'me', permissions }),
  );
  renderWithProviders(
    <ActivityDetailDialog
      formatUsedInput={({ quantity, input }) => `${quantity} ${input.unit}`}
      item={{ activity, ...activityState(activity, TODAY) }}
      today={TODAY}
      {...(withHandlers ? handlers : { onClose: handlers.onClose })}
    />,
    { queryClient },
  );
  return handlers;
}

const dialog = () => screen.findByRole('dialog');
const buttonNames = async () =>
  within(await dialog())
    .getAllByRole('button')
    .map((button) => button.textContent?.trim())
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
    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar realización' }),
    );
    expect(handlers.onEdit).toHaveBeenCalledOnce();
    expect(handlers.onDelete).toHaveBeenCalledOnce();
    expect(handlers.onComplete).toHaveBeenCalledOnce();
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
    expect(within(detail).getByText('100.000 kg')).toBeInTheDocument();
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
});
