import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildMunicipalities, buildProducer } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { expectVisibleFocusOutline } from '@/test/focus-outline';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import type { Producer } from '../api';
import { ProducerForm } from './producer-form';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const PRODUCERS = apiUrl('/api/producers');
const PRODUCER = apiUrl('/api/producers/p1');
const MUNICIPALITIES = apiUrl('/api/catalogs/municipalities');
const GENERIC_DETAIL = 'Los datos enviados no son válidos.';

let bodies: unknown[] = [];

function createHandler(response?: () => Response | Promise<Response>) {
  return http.post(PRODUCERS, async ({ request }) => {
    bodies.push(await request.json());
    return response?.() ?? HttpResponse.json(buildProducer(), { status: 201 });
  });
}

function updateHandler(response?: () => Response | Promise<Response>) {
  return http.patch(PRODUCER, async ({ request }) => {
    bodies.push(await request.json());
    return response?.() ?? HttpResponse.json(buildProducer({ version: 4 }));
  });
}

async function renderForm(producer?: Producer) {
  const result = renderWithProviders(<ProducerForm producer={producer} />);
  await screen.findByRole('option', { name: 'Pamplona' });
  return result;
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Correo electrónico'),
    'ana@example.com',
  );
  await user.type(screen.getByLabelText('Número de documento'), '1234567890');
  await user.type(screen.getByLabelText('Nombres'), 'Ana');
  await user.type(screen.getByLabelText('Apellidos'), 'Prueba');
  await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
  fireEvent.change(screen.getByLabelText('Fecha de vinculación'), {
    target: { value: '2026-03-15' },
  });
}

const submitCreate = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Guardar productor' }));

// El mensaje de un campo se lee por la descripción accesible que la etiqueta le conecta.
const messageOf = (label: string) =>
  document.getElementById(
    screen.getByLabelText(label).getAttribute('aria-describedby') ?? '',
  );

beforeEach(() => {
  vi.clearAllMocks();
  bodies = [];
  server.use(municipalitiesHandler());
});

describe('ProducerForm', () => {
  it('shows the errors of the required fields when submitted empty', async () => {
    const user = userEvent.setup();
    server.use(createHandler());
    await renderForm();

    await submitCreate(user);

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
    expect(bodies).toEqual([]);
  });

  it('accepts only digits in the document and the phone', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Número de documento'), '12a3-45 6');
    await user.type(screen.getByLabelText('Teléfono'), '300 123-4567');

    expect(screen.getByLabelText('Número de documento')).toHaveValue('123456');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
  });

  it('limits the names to 100 characters', async () => {
    await renderForm();

    expect(screen.getByLabelText('Nombres')).toHaveAttribute(
      'maxlength',
      '100',
    );
    expect(screen.getByLabelText('Apellidos')).toHaveAttribute(
      'maxlength',
      '100',
    );
  });

  it('rejects a phone shorter than 7 digits', async () => {
    const user = userEvent.setup();
    server.use(createHandler());
    await renderForm();

    await user.type(screen.getByLabelText('Teléfono'), '12345');
    await submitCreate(user);

    expect(
      await screen.findByText('El teléfono debe tener entre 7 y 10 dígitos.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('rejects an email with an invalid format and sends nothing', async () => {
    const user = userEvent.setup();
    server.use(createHandler());
    await renderForm();
    await fillRequiredFields(user);

    await user.clear(screen.getByLabelText('Correo electrónico'));
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'no-es-correo',
    );
    await submitCreate(user);

    expect(
      await screen.findByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('rejects a future joining date', async () => {
    const user = userEvent.setup();
    server.use(createHandler());
    await renderForm();
    await fillRequiredFields(user);
    fireEvent.change(screen.getByLabelText('Fecha de vinculación'), {
      target: { value: '2999-01-01' },
    });

    await submitCreate(user);

    expect(
      await screen.findByText('La fecha no puede ser posterior a hoy.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('creates the producer with normalized data and goes to its record', async () => {
    const user = userEvent.setup();
    server.use(
      createHandler(() => HttpResponse.json(buildProducer(), { status: 201 })),
    );
    await renderForm();
    await fillRequiredFields(user);
    await user.type(screen.getByLabelText('Teléfono'), '3001234567');
    await user.clear(screen.getByLabelText('Correo electrónico'));
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      '  Ana.Prueba@Example.com ',
    );

    await submitCreate(user);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/productores/p1'),
    );
    expect(bodies).toEqual([
      {
        document_type: 'CC',
        identity_document: '1234567890',
        first_name: 'Ana',
        last_name: 'Prueba',
        phone: '3001234567',
        email: 'ana.prueba@example.com',
        municipality_code: '54518',
        joined_on: '2026-03-15',
      },
    ]);
  });

  it('requires an email to create the access account', async () => {
    const user = userEvent.setup();
    server.use(createHandler());
    await renderForm();
    await fillRequiredFields(user);
    await user.clear(screen.getByLabelText('Correo electrónico'));

    await submitCreate(user);

    expect(
      await screen.findByText(
        'Ingresa el correo para crear la cuenta de acceso.',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('still allows clearing the contact email when editing', async () => {
    const user = userEvent.setup();
    server.use(updateHandler());
    await renderForm(buildProducer({ email: 'ana@example.com' }));
    await user.clear(screen.getByLabelText('Correo electrónico'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(bodies).toEqual([expect.objectContaining({ email: null })]);
  });

  it('shows the field error from the server on its field and does not navigate', async () => {
    const user = userEvent.setup();
    server.use(
      createHandler(() =>
        apiError(
          409,
          'duplicate_document',
          'El documento ya se encuentra registrado.',
          { identity_document: ['Documento ya registrado.'] },
        ),
      ),
    );
    await renderForm();
    await fillRequiredFields(user);

    await submitCreate(user);

    expect(
      await screen.findByText('Documento ya registrado.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Número de documento')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(messageOf('Número de documento')).toHaveTextContent(
      'Documento ya registrado.',
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a generic message when the connection fails', async () => {
    const user = userEvent.setup();
    server.use(http.post(PRODUCERS, () => HttpResponse.error()));
    await renderForm();
    await fillRequiredFields(user);

    await submitCreate(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible guardar el productor. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('warns when the municipality catalog cannot be loaded', async () => {
    server.use(http.get(MUNICIPALITIES, () => apiError(500, 'internal_error')));
    renderWithProviders(<ProducerForm />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar los municipios. Inténtalo nuevamente.',
    );
    expect(screen.getByLabelText('Municipio')).toBeDisabled();
  });

  describe('server errors that have no field in the form', () => {
    it('shows the server messages of a field the form does not have as a general notice', async () => {
      const user = userEvent.setup();
      server.use(
        createHandler(() =>
          apiError(400, 'validation_error', GENERIC_DETAIL, {
            organization_id: ['Campo no permitido.'],
          }),
        ),
      );
      await renderForm();
      await fillRequiredFields(user);

      await submitCreate(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        `${GENERIC_DETAIL} Campo no permitido.`,
      );
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('sends a known field to its field and the messages of an unknown one to the general notice', async () => {
      const user = userEvent.setup();
      server.use(
        createHandler(() =>
          apiError(400, 'validation_error', GENERIC_DETAIL, {
            identity_document: ['El documento no es válido.'],
            expected_version: ['Este campo es requerido.'],
          }),
        ),
      );
      await renderForm();
      await fillRequiredFields(user);

      await submitCreate(user);

      expect(
        await screen.findByText(`${GENERIC_DETAIL} Este campo es requerido.`),
      ).toBeInTheDocument();
      expect(messageOf('Número de documento')).toHaveTextContent(
        'El documento no es válido.',
      );
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('does not repeat a message that several unknown fields share', async () => {
      const user = userEvent.setup();
      server.use(
        createHandler(() =>
          apiError(400, 'validation_error', GENERIC_DETAIL, {
            organization_id: ['Campo no permitido.'],
            status: ['Campo no permitido.'],
          }),
        ),
      );
      await renderForm();
      await fillRequiredFields(user);

      await submitCreate(user);

      expect(
        await screen.findByText(`${GENERIC_DETAIL} Campo no permitido.`),
      ).toBeInTheDocument();
    });

    it('shows the stale version message on edit and does not navigate', async () => {
      const user = userEvent.setup();
      const stale =
        'La ficha fue modificada por otra persona. Recarga antes de guardar.';
      server.use(updateHandler(() => apiError(409, 'stale_version', stale)));
      await renderForm(buildProducer());

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(stale);
      expect(
        screen.getByRole('button', { name: 'Guardar cambios' }),
      ).toBeEnabled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('clears the general notice on the next successful attempt', async () => {
      const user = userEvent.setup();
      let attempts = 0;
      server.use(
        createHandler(() =>
          attempts++ === 0
            ? apiError(500, 'internal_error', 'Ocurrió un error interno.')
            : HttpResponse.json(buildProducer(), { status: 201 }),
        ),
      );
      await renderForm();
      await fillRequiredFields(user);

      await submitCreate(user);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Ocurrió un error interno.',
      );
      await submitCreate(user);

      await waitFor(() => expect(router.replace).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('disables the save button while saving and does not send two creations (no double submit)', async () => {
    const user = userEvent.setup();
    server.use(
      createHandler(async () => {
        await delay(100);
        return HttpResponse.json(buildProducer(), { status: 201 });
      }),
    );
    await renderForm();
    await fillRequiredFields(user);

    await submitCreate(user);
    const pending = await screen.findByRole('button', { name: 'Guardando…' });
    expect(pending).toBeDisabled();
    await user.click(pending);

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(bodies).toHaveLength(1);
  });

  it('keeps the save button disabled after a successful save while the record loads', async () => {
    const user = userEvent.setup();
    server.use(createHandler());
    await renderForm();
    await fillRequiredFields(user);

    await submitCreate(user);

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(bodies).toHaveLength(1);
  });

  it('drops the general notice when the next submit fails validation', async () => {
    const user = userEvent.setup();
    server.use(
      createHandler(() =>
        apiError(500, 'internal_error', 'Ocurrió un error interno.'),
      ),
    );
    await renderForm();
    await fillRequiredFields(user);
    await submitCreate(user);
    await screen.findByText('Ocurrió un error interno.');

    await user.clear(screen.getByLabelText('Nombres'));
    await submitCreate(user);

    expect(
      screen.queryByText('Ocurrió un error interno.'),
    ).not.toBeInTheDocument();
    expect(bodies).toHaveLength(1);
  });

  it('does not send two creations on a double click', async () => {
    const user = userEvent.setup();
    server.use(
      createHandler(async () => {
        await delay(100);
        return HttpResponse.json(buildProducer(), { status: 201 });
      }),
    );
    await renderForm();
    await fillRequiredFields(user);

    await user.dblClick(
      screen.getByRole('button', { name: 'Guardar productor' }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(bodies).toHaveLength(1);
  });

  describe('editing', () => {
    it('preloads the data and saves with the version of the record', async () => {
      const user = userEvent.setup();
      server.use(updateHandler());
      await renderForm(
        buildProducer({ phone: '3001234567', email: 'ana.prueba@example.com' }),
      );

      expect(screen.getByLabelText('Número de documento')).toHaveValue(
        '1234567890',
      );
      expect(screen.getByLabelText('Nombres')).toHaveValue('Ana');
      expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
      expect(screen.getByLabelText('Municipio')).toHaveValue('54001');
      expect(
        screen.getByRole('heading', { name: 'Editar productor' }),
      ).toBeInTheDocument();

      await user.clear(screen.getByLabelText('Apellidos'));
      await user.type(screen.getByLabelText('Apellidos'), 'Nueva');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/productores/p1'),
      );
      expect(bodies).toEqual([
        {
          document_type: 'CC',
          identity_document: '1234567890',
          first_name: 'Ana',
          last_name: 'Nueva',
          phone: '3001234567',
          email: 'ana.prueba@example.com',
          municipality_code: '54001',
          joined_on: '2026-03-15',
          expected_version: 3,
        },
      ]);
    });

    it('sends the version the form was initialised with when the record is refreshed in the background', async () => {
      const user = userEvent.setup();
      server.use(updateHandler());
      const { rerender } = await renderForm(buildProducer());
      await user.clear(screen.getByLabelText('Apellidos'));
      await user.type(screen.getByLabelText('Apellidos'), 'Nueva');

      rerender(
        <ProducerForm
          producer={buildProducer({ version: 4, first_name: 'Otra' })}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(router.replace).toHaveBeenCalled());
      expect(bodies).toEqual([
        expect.objectContaining({
          expected_version: 3,
          first_name: 'Ana',
          last_name: 'Nueva',
        }),
      ]);
    });

    it('keeps sending that version, and the typed values, on a second save after a stale version answer', async () => {
      const user = userEvent.setup();
      server.use(
        updateHandler(() => apiError(409, 'stale_version', 'La ficha cambió.')),
      );
      const { rerender } = await renderForm(buildProducer());
      await user.clear(screen.getByLabelText('Apellidos'));
      await user.type(screen.getByLabelText('Apellidos'), 'Nueva');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'La ficha cambió.',
      );

      rerender(<ProducerForm producer={buildProducer({ version: 4 })} />);
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(bodies).toHaveLength(2));
      expect(bodies).toEqual([
        expect.objectContaining({ expected_version: 3, last_name: 'Nueva' }),
        expect.objectContaining({ expected_version: 3, last_name: 'Nueva' }),
      ]);
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('selects the saved municipality once a slow catalog finishes loading', async () => {
      const user = userEvent.setup();
      server.use(
        updateHandler(),
        http.get(MUNICIPALITIES, async () => {
          await delay(100);
          return HttpResponse.json({ results: buildMunicipalities() });
        }),
      );
      renderWithProviders(<ProducerForm producer={buildProducer()} />);

      expect(
        screen.getByRole('option', { name: 'Cargando municipios…' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Municipio')).toBeDisabled();

      await screen.findByRole('option', { name: 'Cúcuta' });
      await waitFor(() =>
        expect(screen.getByLabelText('Municipio')).toHaveValue('54001'),
      );
      expect(screen.getByLabelText('Municipio')).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(router.replace).toHaveBeenCalled());
      expect(bodies).toEqual([
        expect.objectContaining({ municipality_code: '54001' }),
      ]);
    });

    it('cancels back to the record', async () => {
      await renderForm(buildProducer());

      expectVisibleFocusOutline(screen.getByRole('link', { name: 'Cancelar' }));
      expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
        'href',
        '/productores/p1',
      );
    });
  });

  it('keeps the spacing of the form header below the back link', async () => {
    await renderForm();

    const header = screen.getByRole('heading', { name: 'Registrar productor' })
      .parentElement!.parentElement!;
    expect(header).toHaveClass('mt-5');
    expect(header).not.toHaveClass('mt-4');
  });

  it('cancels back to the list when creating', async () => {
    await renderForm();

    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/productores',
    );
    expect(screen.getByRole('link', { name: 'Productores' })).toHaveAttribute(
      'href',
      '/productores',
    );
  });
});
