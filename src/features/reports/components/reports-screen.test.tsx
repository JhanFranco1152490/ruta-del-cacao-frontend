import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildReport, buildSession } from '@/test/factories';
import {
  associationReportHandler,
  farmsHandler,
  lotsHandler,
  plotsHandler,
  producerReportHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { ReportsScreen } from './reports-screen';

const OWNER = [
  PERMISSIONS.REPORTS_VIEW_PRODUCER,
  PERMISSIONS.HARVESTS_VIEW,
  PERMISSIONS.LOTS_VIEW,
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.SALES_VIEW,
];
// Como el capataz de la demostración: cosechas y lotes, sin bodega ni ventas.
const FOREMAN = [
  PERMISSIONS.REPORTS_VIEW_PRODUCER,
  PERMISSIONS.HARVESTS_VIEW,
  PERMISSIONS.LOTS_VIEW,
];
const ADMINISTRATOR = [PERMISSIONS.REPORTS_VIEW_ASSOCIATION];

let producerRequests: URLSearchParams[];
let associationRequests: URLSearchParams[];

beforeEach(() => {
  // Viernes 13 de noviembre de 2026, en Bogotá. Solo la fecha: las esperas siguen corriendo.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));
  producerRequests = [];
  associationRequests = [];
  resetLocation();
  mockLocation.path = '/reportes';
  server.use(
    producerReportHandler(buildReport(), producerRequests),
    associationReportHandler(undefined, associationRequests),
    farmsHandler(),
    plotsHandler(),
    lotsHandler(),
  );
  return () => vi.useRealTimers();
});

function renderScreen({
  searchParams = '',
  permissions = OWNER,
  superuser = false,
}: {
  searchParams?: string;
  permissions?: string[];
  superuser?: boolean;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ permissions, is_superuser: superuser }),
  );
  return renderWithProviders(<ReportsScreen />, {
    queryClient,
    searchParams,
  });
}

const typeField = () =>
  screen.getByRole('combobox', { name: 'Tipo de reporte' });

const typeOptions = () =>
  within(typeField())
    .getAllByRole('option')
    .filter((option) => !option.hasAttribute('hidden'))
    .map((option) => option.textContent);

describe('ReportsScreen del productor', () => {
  it('abre sin reporte, con los cinco tipos y el periodo de este año', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reportes' }),
    ).toBeInTheDocument();
    expect(typeOptions()).toEqual([
      'Producción',
      'Calidad',
      'Inventario',
      'Comercialización',
      'Trazabilidad',
    ]);
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-11-13');
    expect(screen.getByRole('button', { name: 'Este año' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Aún no hay un reporte.')).toBeInTheDocument();
    // Una sola vista: no hay nada que elegir.
    expect(screen.queryByRole('group', { name: 'Vista' })).toBeNull();
    expect(producerRequests).toEqual([]);
  });

  it('ofrece solo los tipos de los módulos que la cuenta ve', () => {
    renderScreen({ permissions: FOREMAN });

    expect(typeOptions()).toEqual(['Producción', 'Calidad', 'Trazabilidad']);
  });

  it('dice que no hay reportes cuando la cuenta no ve ningún módulo', () => {
    renderScreen({ permissions: [PERMISSIONS.REPORTS_VIEW_PRODUCER] });

    expect(
      screen.getByText('No tienes reportes disponibles.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Tipo de reporte' }),
    ).toBeNull();
  });

  // CA-02 de HU-46.
  it('pide el tipo de reporte antes de generar', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: 'Generar' }));

    expect(typeField()).toHaveAccessibleDescription(
      'Seleccione el tipo de reporte.',
    );
    expect(producerRequests).toEqual([]);
  });

  // CA-03 de HU-46.
  it('no genera con la fecha final antes de la inicial', async () => {
    const user = userEvent.setup();
    renderScreen({
      searchParams: '?tipo=production&desde=2026-06-01&hasta=2026-03-01',
    });

    expect(screen.getByLabelText('Desde')).toHaveAccessibleDescription(
      'La fecha final no puede ser anterior a la inicial.',
    );
    await user.click(screen.getByRole('button', { name: 'Generar' }));

    expect(screen.getByText('Aún no hay un reporte.')).toBeInTheDocument();
    expect(producerRequests).toEqual([]);
  });

  it('genera el reporte del tipo elegido con el periodo de este año', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.selectOptions(typeField(), 'Producción');
    await user.click(screen.getByRole('button', { name: 'Generar' }));

    const report = await screen.findByRole('region', { name: 'Producción' });
    expect(report).toHaveTextContent(
      'Periodo: 01/01/2026 – 31/03/2026 · Finca: F01 · La Esperanza',
    );
    expect(report).toHaveTextContent(
      'Generado el 31/03/2026 a las 10:15 por Ana Ejemplo',
    );
    expect(
      within(report).getByRole('table', {
        name: 'Filas del reporte de Producción',
      }),
    ).toBeInTheDocument();
    expect(
      within(report).getByRole('button', { name: 'Exportar' }),
    ).toBeEnabled();
    expect(Object.fromEntries(producerRequests[0])).toEqual({
      type: 'production',
      from: '2026-01-01',
      to: '2026-11-13',
    });
  });

  // Un enlace compartido abre el mismo reporte.
  it('genera al abrir un enlace con generar=1', async () => {
    renderScreen({ searchParams: '?tipo=quality&finca=f1&generar=1' });

    await screen.findByRole('region', { name: 'Producción' });
    expect(producerRequests[0].get('type')).toBe('quality');
    expect(producerRequests[0].get('farm')).toBe('f1');
  });

  // Lo que se ve corresponde siempre a los filtros de arriba.
  it('quita el reporte al cambiar un filtro', async () => {
    const user = userEvent.setup();
    renderScreen({ searchParams: '?tipo=production&generar=1' });
    await screen.findByRole('region', { name: 'Producción' });

    await user.selectOptions(typeField(), 'Calidad');

    expect(screen.queryByRole('region', { name: 'Producción' })).toBeNull();
    expect(screen.getByText('Aún no hay un reporte.')).toBeInTheDocument();
  });

  it('cambia las fechas con un atajo del periodo', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '3 meses' }));

    expect(screen.getByLabelText('Desde')).toHaveValue('2026-09-01');
    expect(screen.getByRole('button', { name: '3 meses' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('muestra las existencias de hoy en el inventario, sin periodo', () => {
    renderScreen({ searchParams: '?tipo=inventory' });

    expect(screen.getByText('Existencias a hoy')).toBeInTheDocument();
    expect(screen.queryByLabelText('Desde')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Periodo' })).toBeNull();
  });

  it('filtra por parcela y por lote', () => {
    renderScreen();
    expect(
      screen.getByRole('combobox', { name: 'Parcela' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Lote' })).toBeInTheDocument();
  });

  // Los lotes se buscan en su lista, que pide su propio permiso.
  it('no ofrece el filtro de lote a quien no ve los lotes', () => {
    renderScreen({
      permissions: OWNER.filter((code) => code !== PERMISSIONS.LOTS_VIEW),
    });

    expect(
      screen.getByRole('combobox', { name: 'Parcela' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Lote' })).toBeNull();
  });

  it('dice en la fila el filtro que el servidor no encontró', async () => {
    server.use(
      producerReportHandler(
        apiError(404, 'not_found', 'Un filtro del reporte no existe.', {
          farm: ['La finca no existe.'],
        }),
      ),
    );
    renderScreen({ searchParams: '?tipo=production&finca=f9&generar=1' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La finca no existe.',
    );
  });

  it('muestra el aviso del servidor cuando no es de un filtro', async () => {
    server.use(
      producerReportHandler(
        apiError(
          403,
          'permission_denied',
          'No tienes permiso para consultar la información de este reporte.',
        ),
      ),
    );
    renderScreen({ searchParams: '?tipo=sales&generar=1' });

    expect(
      await screen.findByText(
        'No tienes permiso para consultar la información de este reporte.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ReportsScreen de la asociación', () => {
  it('ofrece sus tres tipos y sus filtros, sin parcela ni lote', () => {
    renderScreen({ permissions: ADMINISTRATOR });

    expect(typeOptions()).toEqual([
      'Producción',
      'Calidad',
      'Comercialización',
    ]);
    expect(
      screen.getByRole('combobox', { name: 'Municipio' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Parcela' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Lote' })).toBeNull();
  });

  it('genera el reporte de la asociación por su ruta', async () => {
    renderScreen({
      permissions: ADMINISTRATOR,
      searchParams: '?tipo=sales&municipio=54001&generar=1',
    });

    await screen.findByRole('region', { name: 'Comercialización' });
    expect(associationRequests[0].get('municipality')).toBe('54001');
    expect(producerRequests).toEqual([]);
  });

  // La cuenta técnica tiene las dos y abre la consolidada.
  it('deja elegir la vista a quien tiene las dos, empezando por la asociación', async () => {
    const user = userEvent.setup();
    renderScreen({
      permissions: [...OWNER, PERMISSIONS.REPORTS_VIEW_ASSOCIATION],
      superuser: true,
    });

    const views = screen.getByRole('group', { name: 'Vista' });
    expect(
      within(views).getByRole('button', { name: 'Asociación' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(views).getByRole('button', { name: 'Productor' }));

    await waitFor(() =>
      expect(typeOptions()).toEqual([
        'Producción',
        'Calidad',
        'Inventario',
        'Comercialización',
        'Trazabilidad',
      ]),
    );
  });
});
