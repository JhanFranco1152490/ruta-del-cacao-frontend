import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  createProducer,
  getMunicipalities,
  updateProducer,
} from '@/lib/producers/api';
import type { Producer } from '@/lib/producers/types';

import { ProducerForm } from '../producer-form';

const router = { replace: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/producers/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/producers/api')>()),
  createProducer: vi.fn(),
  getMunicipalities: vi.fn(),
  updateProducer: vi.fn(),
}));

const municipalities = [
  { code: '54001', name: 'Cúcuta' },
  { code: '54518', name: 'Pamplona' },
];

function savedProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: 'producer-1',
    member_code: 'PROD-000001',
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

async function renderForm(producer?: Producer) {
  render(<ProducerForm producer={producer} />);
  await screen.findByRole('option', { name: 'Pamplona' });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Número de documento'), '1234567890');
  await user.type(screen.getByLabelText('Nombres'), 'Ana');
  await user.type(screen.getByLabelText('Apellidos'), 'Prueba');
  await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
  fireEvent.change(screen.getByLabelText('Fecha de vinculación'), {
    target: { value: '2026-03-15' },
  });
}

describe('ProducerForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getMunicipalities).mockResolvedValue(municipalities);
  });

  it('muestra los errores de los campos obligatorios al enviar vacío', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    expect(
      await screen.findByText('Ingresa solo números, entre 6 y 15 dígitos.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa los nombres.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa los apellidos.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un municipio.')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa la fecha de vinculación.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombres')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(createProducer).not.toHaveBeenCalled();
  });

  it('solo acepta dígitos en documento y teléfono', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Número de documento'), '12a3-45 6');
    await user.type(screen.getByLabelText('Teléfono'), '300 123-4567');

    expect(screen.getByLabelText('Número de documento')).toHaveValue('123456');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
  });

  it('rechaza un teléfono de menos de 7 dígitos', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Teléfono'), '12345');
    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    expect(
      await screen.findByText('El teléfono debe tener entre 7 y 10 dígitos.'),
    ).toBeInTheDocument();
    expect(createProducer).not.toHaveBeenCalled();
  });

  it('rechaza un correo con formato inválido', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'no-es-correo',
    );
    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    expect(
      await screen.findByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument();
  });

  it('rechaza una fecha de vinculación futura', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillRequiredFields(user);
    fireEvent.change(screen.getByLabelText('Fecha de vinculación'), {
      target: { value: '2999-01-01' },
    });

    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    expect(
      await screen.findByText('La fecha no puede ser posterior a hoy.'),
    ).toBeInTheDocument();
    expect(createProducer).not.toHaveBeenCalled();
  });

  it('crea el productor con los datos normalizados y navega a su ficha', async () => {
    const user = userEvent.setup();
    vi.mocked(createProducer).mockResolvedValue(savedProducer());
    await renderForm();
    await fillRequiredFields(user);
    await user.type(screen.getByLabelText('Teléfono'), '3001234567');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      '  Ana.Prueba@Example.com ',
    );

    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    await waitFor(() =>
      expect(createProducer).toHaveBeenCalledWith({
        document_type: 'CC',
        identity_document: '1234567890',
        first_name: 'Ana',
        last_name: 'Prueba',
        phone: '3001234567',
        email: 'ana.prueba@example.com',
        municipality_code: '54518',
        joined_on: '2026-03-15',
      }),
    );
    expect(router.replace).toHaveBeenCalledWith('/producers/producer-1');
  });

  it('envía teléfono y correo como null cuando se dejan vacíos', async () => {
    const user = userEvent.setup();
    vi.mocked(createProducer).mockResolvedValue(savedProducer());
    await renderForm();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    await waitFor(() =>
      expect(createProducer).toHaveBeenCalledWith(
        expect.objectContaining({ phone: null, email: null }),
      ),
    );
  });

  it('muestra el error del campo devuelto por el servidor y no navega', async () => {
    const user = userEvent.setup();
    vi.mocked(createProducer).mockRejectedValue(
      new ApiError(409, {
        code: 'duplicate_document',
        message: 'El documento ya se encuentra registrado.',
        fields: { identity_document: ['Documento ya registrado.'] },
      }),
    );
    await renderForm();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    expect(
      await screen.findByText('Documento ya registrado.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('El documento ya se encuentra registrado.'),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('muestra un mensaje genérico si falla la conexión', async () => {
    const user = userEvent.setup();
    vi.mocked(createProducer).mockRejectedValue(new TypeError('network'));
    await renderForm();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Guardar productor' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible guardar el productor. Revisa tu conexión',
    );
  });

  it('avisa si no se pudo cargar el catálogo de municipios', async () => {
    vi.mocked(getMunicipalities).mockRejectedValue(new Error('falla'));
    render(<ProducerForm />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Municipio')).toBeDisabled();
  });

  it('en edición precarga los datos y guarda con la versión de la ficha', async () => {
    const user = userEvent.setup();
    vi.mocked(updateProducer).mockResolvedValue(savedProducer({ version: 4 }));
    await renderForm(savedProducer());

    expect(screen.getByLabelText('Número de documento')).toHaveValue(
      '1234567890',
    );
    expect(screen.getByLabelText('Nombres')).toHaveValue('Ana');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
    expect(screen.getByLabelText('Municipio')).toHaveValue('54001');

    await user.clear(screen.getByLabelText('Apellidos'));
    await user.type(screen.getByLabelText('Apellidos'), 'Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(updateProducer).toHaveBeenCalledWith(
        'producer-1',
        expect.objectContaining({ last_name: 'Nueva' }),
        3,
      ),
    );
    expect(createProducer).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/producers/producer-1');
  });
});
