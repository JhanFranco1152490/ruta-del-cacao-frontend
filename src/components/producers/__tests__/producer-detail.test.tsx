import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  changeProducerStatus,
  getMunicipalities,
  getProducer,
} from '@/lib/producers/api';
import type { Producer } from '@/lib/producers/types';

import { ProducerDetail, ProducerEditor } from '../producer-detail';

// El router debe ser la misma referencia entre renders: los componentes lo usan como dependencia de efectos.
const router = { replace: vi.fn(), refresh: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/producers/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/producers/api')>()),
  changeProducerStatus: vi.fn(),
  getMunicipalities: vi.fn(),
  getProducer: vi.fn(),
}));

function producer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: 'producer-1',
    member_code: 'PROD-000001',
    organization_id: 'org-1',
    document_type: 'CC',
    identity_document: '1234567890',
    first_name: 'Ana',
    last_name: 'Prueba',
    phone: '3001234567',
    email: 'ana.prueba@example.com',
    municipality_code: '54001',
    joined_on: '2026-03-15',
    status: 'active',
    version: 3,
    created_at: '2026-03-15T12:00:00Z',
    updated_at: '2026-03-15T12:00:00Z',
    ...overrides,
  };
}

describe('ProducerDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProducer).mockResolvedValue(producer());
  });

  it('muestra la ficha con los datos sensibles enmascarados', async () => {
    render(<ProducerDetail id="producer-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Ana Prueba' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CC ••••7890')).toBeInTheDocument();
    expect(screen.getByText('••••4567')).toBeInTheDocument();
    expect(screen.getByText('••••.com')).toBeInTheDocument();
    expect(screen.queryByText(/1234567890/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3001234567/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ana\.prueba/)).not.toBeInTheDocument();
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
  });

  it('indica "Sin registrar" cuando faltan teléfono y correo', async () => {
    vi.mocked(getProducer).mockResolvedValue(
      producer({ phone: null, email: null }),
    );
    render(<ProducerDetail id="producer-1" />);

    expect(await screen.findAllByText('Sin registrar')).toHaveLength(2);
  });

  it('enmascara por completo los valores de 4 caracteres o menos', async () => {
    vi.mocked(getProducer).mockResolvedValue(producer({ phone: '1234' }));
    render(<ProducerDetail id="producer-1" />);

    expect(await screen.findByText('••••')).toBeInTheDocument();
    expect(screen.queryByText(/1234$/)).not.toBeInTheDocument();
  });

  it('enlaza a la edición del productor', async () => {
    render(<ProducerDetail id="producer-1" />);

    expect(
      await screen.findByRole('link', { name: /Editar datos/ }),
    ).toHaveAttribute('href', '/producers/producer-1/edit');
  });

  it('muestra el error cuando la ficha no se puede cargar', async () => {
    vi.mocked(getProducer).mockRejectedValue(
      new ApiError(404, { message: 'El productor no existe.' }),
    );
    render(<ProducerDetail id="producer-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El productor no existe.',
    );
    expect(
      screen.getByRole('link', { name: 'Volver a productores' }),
    ).toHaveAttribute('href', '/producers');
  });

  it('desactiva al productor después de confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(changeProducerStatus).mockResolvedValue(
      producer({ status: 'inactive', version: 4 }),
    );
    render(<ProducerDetail id="producer-1" />);

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('¿Desactivar productor?'),
    ).toBeInTheDocument();
    expect(changeProducerStatus).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    await waitFor(() =>
      expect(changeProducerStatus).toHaveBeenCalledWith(
        'producer-1',
        'inactive',
        3,
      ),
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText('Productor inactivo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
  });

  it('no desactiva si se cancela la confirmación', async () => {
    const user = userEvent.setup();
    render(<ProducerDetail id="producer-1" />);

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(changeProducerStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
  });

  it('muestra el error del servidor si la desactivación falla', async () => {
    const user = userEvent.setup();
    vi.mocked(changeProducerStatus).mockRejectedValue(
      new ApiError(409, { message: 'La ficha fue modificada.' }),
    );
    render(<ProducerDetail id="producer-1" />);

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'La ficha fue modificada.',
    );
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
  });

  it('no ofrece desactivar a un productor que ya está inactivo', async () => {
    vi.mocked(getProducer).mockResolvedValue(producer({ status: 'inactive' }));
    render(<ProducerDetail id="producer-1" />);

    expect(await screen.findByText('Productor inactivo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
  });
});

describe('ProducerDetail - reactivación', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProducer).mockResolvedValue(producer({ status: 'inactive' }));
  });

  it('ofrece reactivar a un productor inactivo y no ofrece desactivar', async () => {
    render(<ProducerDetail id="producer-1" />);

    expect(
      await screen.findByRole('button', { name: 'Reactivar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
  });

  it('no ofrece reactivar a un productor activo', async () => {
    vi.mocked(getProducer).mockResolvedValue(producer());
    render(<ProducerDetail id="producer-1" />);

    await screen.findByRole('button', { name: 'Desactivar' });
    expect(
      screen.queryByRole('button', { name: 'Reactivar' }),
    ).not.toBeInTheDocument();
  });

  it('reactiva al productor después de confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducer).mockResolvedValue(
      producer({ status: 'inactive', version: 4 }),
    );
    vi.mocked(changeProducerStatus).mockResolvedValue(
      producer({ status: 'active', version: 5 }),
    );
    render(<ProducerDetail id="producer-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reactivar' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('¿Reactivar productor?'),
    ).toBeInTheDocument();
    expect(changeProducerStatus).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole('button', { name: 'Reactivar productor' }),
    );

    await waitFor(() =>
      expect(changeProducerStatus).toHaveBeenCalledWith(
        'producer-1',
        'active',
        4,
      ),
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText('Productor activo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reactivar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Desactivar' }),
    ).toBeInTheDocument();
  });

  it('no reactiva si se cancela la confirmación', async () => {
    const user = userEvent.setup();
    render(<ProducerDetail id="producer-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reactivar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(changeProducerStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Productor inactivo')).toBeInTheDocument();
  });

  it('muestra el error del servidor si la reactivación falla', async () => {
    const user = userEvent.setup();
    vi.mocked(changeProducerStatus).mockRejectedValue(
      new ApiError(409, { message: 'La ficha fue modificada.' }),
    );
    render(<ProducerDetail id="producer-1" />);

    await user.click(await screen.findByRole('button', { name: 'Reactivar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Reactivar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'La ficha fue modificada.',
    );
    expect(screen.getByText('Productor inactivo')).toBeInTheDocument();
  });
});

describe('ProducerEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getMunicipalities).mockResolvedValue([]);
  });

  it('carga el productor y muestra el formulario de edición con sus datos', async () => {
    vi.mocked(getProducer).mockResolvedValue(producer());
    render(<ProducerEditor id="producer-1" />);

    expect(await screen.findByLabelText('Nombres')).toHaveValue('Ana');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Prueba');
  });

  it('muestra el error cuando no se puede cargar el productor', async () => {
    vi.mocked(getProducer).mockRejectedValue(
      new ApiError(404, { message: 'El productor no existe.' }),
    );
    render(<ProducerEditor id="producer-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El productor no existe.',
    );
  });
});
