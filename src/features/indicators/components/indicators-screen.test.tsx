import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { todayInBogota } from '@/lib/format/dates';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAssociationIndicators,
  buildProducerIndicators,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  associationIndicatorsHandler,
  producerIndicatorsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { IndicatorsScreen } from './indicators-screen';

const PRODUCER = [PERMISSIONS.INDICATORS_VIEW_PRODUCER];
const ASSOCIATION = [PERMISSIONS.INDICATORS_VIEW_ASSOCIATION];

let producerRequests: URLSearchParams[];
let associationRequests: URLSearchParams[];

beforeEach(() => {
  producerRequests = [];
  associationRequests = [];
  resetLocation();
  mockLocation.path = '/indicadores';
  router.push.mockClear();
  server.use(
    producerIndicatorsHandler(buildProducerIndicators(), producerRequests),
    associationIndicatorsHandler(
      buildAssociationIndicators(),
      associationRequests,
    ),
  );
});

function renderScreen({
  searchParams = '',
  permissions = PRODUCER,
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
  return renderWithProviders(<IndicatorsScreen />, {
    queryClient,
    searchParams,
  });
}

describe('IndicatorsScreen del productor', () => {
  it('muestra las cifras de su unidad productiva en la franja', async () => {
    renderScreen();

    const summary = await screen.findByRole('region', {
      name: 'Resumen del periodo',
    });
    expect(summary).toHaveTextContent('Kg en baba720 kg144 kg/ha');
    expect(summary).toHaveTextContent('Kg secos166 kg33,2 kg/ha');
    expect(summary).toHaveTextContent('En bodega155 kg');
    expect(summary).toHaveTextContent('Kg vendidos210 kg2 ventas');
  });

  it('dibuja la producción por parcela, la calidad, las existencias y las ventas', async () => {
    renderScreen();

    const plots = await screen.findByRole('list', {
      name: 'Kilos en baba por parcela',
    });
    expect(plots).toHaveTextContent('F01 · P01 · Lote del río');
    expect(plots).toHaveTextContent('620 kg');
    expect(
      screen.getByRole('img', {
        name: /^Calidad de lo clasificado: G1 76,3 %/,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('list', { name: 'Existencias por calibre' }),
    ).toHaveTextContent('G1120 kg');
    expect(
      screen.getByRole('table', { name: 'Kilos vendidos por mes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Kilos cosechados y secos por mes' }),
    ).toBeInTheDocument();
  });

  it('pide el año corrido y no manda productor ni finca', async () => {
    renderScreen();

    await screen.findByRole('region', { name: 'Resumen del periodo' });
    const [request] = producerRequests;
    expect(request.get('from')).toBe(`${todayInBogota().slice(0, 4)}-01-01`);
    expect(request.get('to')).toBe(todayInBogota());
    expect(request.has('farm')).toBe(false);
    expect(request.has('producer')).toBe(false);
    expect(associationRequests).toHaveLength(0);
  });

  it('respeta el periodo y la finca de la dirección', async () => {
    renderScreen({ searchParams: '?periodo=3m&finca=f1' });

    await screen.findByRole('region', { name: 'Resumen del periodo' });
    const [request] = producerRequests;
    expect(request.get('from')).toMatch(/^\d{4}-\d{2}-01$/);
    expect(request.get('to')).toBe(todayInBogota());
    expect(request.get('farm')).toBe('f1');
    expect(screen.getByRole('button', { name: '3 meses' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('cambia de kilos en baba a secos', async () => {
    const user = userEvent.setup();
    renderScreen();

    await screen.findByRole('list', { name: 'Kilos en baba por parcela' });
    await user.click(screen.getByRole('button', { name: 'Seco' }));

    const plots = screen.getByRole('list', { name: 'Kilos secos por parcela' });
    expect(plots).toHaveTextContent('136 kg');
    expect(plots).toHaveTextContent('54,4 kg/ha');
  });

  it('no ofrece el panel de la asociación ni el cambio de panel', async () => {
    renderScreen();

    await screen.findByRole('region', { name: 'Resumen del periodo' });
    expect(screen.queryByRole('group', { name: 'Panel' })).toBeNull();
  });

  it('dice que no hay cifras cuando el periodo está vacío', async () => {
    const base = buildProducerIndicators();
    server.use(
      producerIndicatorsHandler(
        buildProducerIndicators({
          production: { ...base.production, green_kg: '0.0', plots: [] },
          quality: { ...base.quality, classified_kg: '0.0' },
          inventory: { ...base.inventory, total_kg: '0.0', farms: [] },
          sales: { ...base.sales, sold_kg: '0.0', sales: 0 },
        }),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Aún no hay cifras en este periodo.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Resumen del periodo' }),
    ).toBeNull();
  });

  it('ofrece reintentar cuando el servidor falla', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(apiUrl('/api/indicators/producer'), () =>
        HttpResponse.json(
          { detail: 'Error', code: 'server_error', fields: {} },
          { status: 500 },
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText('No fue posible cargar los indicadores.'),
    ).toBeInTheDocument();
    server.use(producerIndicatorsHandler(buildProducerIndicators()));
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('region', { name: 'Resumen del periodo' }),
    ).toBeInTheDocument();
  });
});

describe('IndicatorsScreen de la asociación', () => {
  it('muestra los totales y una barra por finca con su productor y municipio', async () => {
    renderScreen({ permissions: ASSOCIATION });

    const summary = await screen.findByRole('region', {
      name: 'Resumen del periodo',
    });
    expect(summary).toHaveTextContent('Fincas con cifras22 productores');
    expect(summary).toHaveTextContent('Kg en baba820 kg');
    expect(summary).toHaveTextContent('Kg vendidos260 kg');
    const farms = screen.getByRole('list', { name: 'Kilos por finca' });
    expect(farms).toHaveTextContent('F01 · La Esperanza');
    await waitFor(() =>
      expect(farms).toHaveTextContent('Ana Ejemplo · Cúcuta'),
    );
    expect(farms).toHaveTextContent('Luis Ejemplo');
    expect(associationRequests).toHaveLength(1);
    expect(producerRequests).toHaveLength(0);
  });

  it('no muestra nada por parcela, por lote ni de existencias', async () => {
    renderScreen({ permissions: ASSOCIATION });

    await screen.findByRole('region', { name: 'Resumen del periodo' });
    expect(screen.queryByText('Producción por parcela')).toBeNull();
    expect(screen.queryByText('Existencias en bodega')).toBeNull();
    expect(screen.queryByText(/lotes? clasificados?/)).toBeNull();
  });

  it('reparte la calidad de cada finca con sus porcentajes escritos', async () => {
    renderScreen({ permissions: ASSOCIATION });

    expect(
      await screen.findByRole('img', {
        name: 'Calidad de Villa Rosa: G1 60 %, G2 30 %, Descarte 10 %',
      }),
    ).toBeVisible();
  });

  it('cambia los kilos que mide cada barra', async () => {
    const user = userEvent.setup();
    renderScreen({ permissions: ASSOCIATION });

    await screen.findByRole('list', { name: 'Kilos por finca' });
    await user.click(screen.getByRole('button', { name: 'Vendido' }));

    const [first, second] = within(
      screen.getByRole('list', { name: 'Kilos por finca' }),
    ).getAllByRole('listitem');
    expect(first).toHaveTextContent('210 kg');
    expect(second).toHaveTextContent('50 kg');
  });

  it('dice que no hay cifras si ninguna finca tiene', async () => {
    server.use(
      associationIndicatorsHandler(buildAssociationIndicators({ farms: [] })),
    );
    renderScreen({ permissions: ASSOCIATION });

    expect(
      await screen.findByRole('heading', {
        name: 'Aún no hay cifras en este periodo.',
      }),
    ).toBeInTheDocument();
  });
});

describe('IndicatorsScreen de la cuenta técnica', () => {
  const BOTH = [...PRODUCER, ...ASSOCIATION];

  it('abre el panel de la asociación y ofrece cambiar al del productor', async () => {
    renderScreen({ permissions: BOTH, superuser: true });

    await screen.findByRole('list', { name: 'Kilos por finca' });
    expect(screen.getByRole('group', { name: 'Panel' })).toBeInTheDocument();
    expect(producerRequests).toHaveLength(0);
  });

  it('en el del productor pide elegir uno antes de pedir las cifras', async () => {
    renderScreen({
      permissions: BOTH,
      superuser: true,
      searchParams: '?vista=producer',
    });

    expect(
      await screen.findByRole('heading', {
        name: 'Falta elegir el productor.',
      }),
    ).toBeInTheDocument();
    expect(producerRequests).toHaveLength(0);
  });

  it('manda el productor elegido', async () => {
    renderScreen({
      permissions: BOTH,
      superuser: true,
      searchParams: '?vista=producer&productor=p1',
    });

    await screen.findByRole('region', { name: 'Resumen del periodo' });
    expect(producerRequests[0].get('producer')).toBe('p1');
  });
});
