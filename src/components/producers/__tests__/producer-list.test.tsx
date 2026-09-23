import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getMunicipalities, getProducers } from '@/lib/producers/api';
import type {
  ProducerListItem,
  ProducerListResponse,
} from '@/lib/producers/types';

import { ProducerList } from '../producer-list';

// El router debe ser la misma referencia entre renders: el componente lo usa como dependencia de efectos.
const router = { replace: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/producers/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/producers/api')>()),
  getMunicipalities: vi.fn(),
  getProducers: vi.fn(),
}));

const municipalities = [
  { code: '54001', name: 'Cúcuta' },
  { code: '54518', name: 'Pamplona' },
];

function producer(overrides: Partial<ProducerListItem> = {}): ProducerListItem {
  return {
    id: 'producer-1',
    member_code: 'PROD-000001',
    document_type: 'CC',
    identity_document: '1234567890',
    first_name: 'Ana',
    last_name: 'Prueba',
    municipality_code: '54001',
    status: 'active',
    ...overrides,
  };
}

function response(
  results: ProducerListItem[],
  count = results.length,
): ProducerListResponse {
  return { count, page: 1, page_size: 20, results };
}

describe('ProducerList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getMunicipalities).mockResolvedValue(municipalities);
    vi.mocked(getProducers).mockResolvedValue(response([producer()]));
  });

  it('muestra el productor con documento enmascarado y municipio resuelto', async () => {
    render(<ProducerList />);

    const row = (await screen.findByText('Ana Prueba')).closest('tr')!;
    expect(within(row).getByText('PROD-000001')).toBeInTheDocument();
    expect(within(row).getByText('CC ••••7890')).toBeInTheDocument();
    expect(within(row).queryByText(/1234567890/)).not.toBeInTheDocument();
    expect(await within(row).findByText('Cúcuta')).toBeInTheDocument();
    expect(within(row).getByText('Activo')).toBeInTheDocument();
    expect(
      within(row).getByRole('link', { name: /Ver\s?ficha de Ana Prueba/ }),
    ).toHaveAttribute('href', '/producers/producer-1');
    expect(
      within(row).getByRole('link', { name: /Editar\s?ficha de Ana Prueba/ }),
    ).toHaveAttribute('href', '/producers/producer-1/edit');
  });

  it('muestra el estado vacío cuando no hay resultados', async () => {
    vi.mocked(getProducers).mockResolvedValue(response([]));
    render(<ProducerList />);

    expect(
      await screen.findByText('No hay productores para mostrar'),
    ).toBeInTheDocument();
  });

  it('muestra el error y reintenta la carga', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducers)
      .mockRejectedValueOnce(new Error('falla de red'))
      .mockResolvedValue(response([producer()]));
    render(<ProducerList />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar los productores.',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ana Prueba')).toBeInTheDocument();
    expect(getProducers).toHaveBeenCalledTimes(2);
  });

  it('redirige al inicio de sesión cuando la sesión expiró', async () => {
    vi.mocked(getProducers).mockRejectedValue(
      new ApiError(401, { message: 'No autenticado' }),
    );
    render(<ProducerList />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('busca después de una pausa al escribir y vuelve a la página 1', async () => {
    const user = userEvent.setup();
    render(<ProducerList />);
    await screen.findByText('Ana Prueba');

    await user.type(screen.getByLabelText('Buscar productores'), 'Prueba');

    await waitFor(() =>
      expect(getProducers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Prueba', page: 1 }),
        expect.anything(),
      ),
    );
    // La pausa evita una petición por cada tecla.
    const searches = vi
      .mocked(getProducers)
      .mock.calls.map(([filters]) => filters.search);
    expect(searches).not.toContain('P');
  });

  it('filtra por estado y por municipio', async () => {
    const user = userEvent.setup();
    render(<ProducerList />);
    await screen.findByText('Ana Prueba');
    await screen.findByRole('option', { name: 'Pamplona' });
    const [statusSelect, municipalitySelect] = screen.getAllByRole('combobox');

    await user.selectOptions(statusSelect, 'inactive');
    await waitFor(() =>
      expect(getProducers).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'inactive' }),
        expect.anything(),
      ),
    );

    await user.selectOptions(municipalitySelect, '54518');
    await waitFor(() =>
      expect(getProducers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'inactive',
          municipalityCode: '54518',
        }),
        expect.anything(),
      ),
    );
  });

  it('pagina los resultados y respeta los límites', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducers).mockResolvedValue(response([producer()], 45));
    render(<ProducerList />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('45 productores encontrados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
    expect(getProducers).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything(),
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('no muestra paginación cuando todo cabe en una página', async () => {
    render(<ProducerList />);
    await screen.findByText('Ana Prueba');

    expect(
      screen.queryByRole('navigation', { name: 'Paginación de productores' }),
    ).not.toBeInTheDocument();
  });
});
