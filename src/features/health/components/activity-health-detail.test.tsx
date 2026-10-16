import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { components } from '@/lib/api/schema';
import { buildAgriculturalActivity } from '@/test/factories';

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

describe('ActivityHealthDetail', () => {
  it('shows what was evaluated, each detection with its controls and what is missing', () => {
    render(
      <ActivityHealthDetail
        activity={buildAgriculturalActivity({
          activity_type: 'phytosanitary_monitoring',
          status: 'done',
          monitoring: monitoring(),
        })}
      />,
    );

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
    render(
      <ActivityHealthDetail
        activity={buildAgriculturalActivity({
          activity_type: 'phytosanitary_monitoring',
          status: 'done',
          monitoring: monitoring({
            no_presence: true,
            detections: [],
            notes: null,
            detections_without_control: 0,
          }),
        })}
      />,
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
