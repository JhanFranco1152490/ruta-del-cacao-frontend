import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildBuyer, buildPage } from '@/test/factories';
import { apiUrl, buyerWriteHandler, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { Buyer } from '../api';
import { BuyerFormDialog } from './buyer-form-dialog';

const oriente = buildBuyer({
  id: 'b1',
  name: 'Chocolates del Oriente S.A.S.',
  document_type: 'NIT',
  identity_document: '900000001',
});
const ceiba = buildBuyer({
  id: 'b2',
  name: 'Acopio La Ceiba',
  document_type: 'CC',
  identity_document: '1000000002',
  is_active: false,
  version: 3,
});

let bodies: unknown[];

beforeEach(() => {
  bodies = [];
});

function renderDialog({
  buyer,
  known = [oriente, ceiba],
  chooseProducer = false,
  producer = null,
}: {
  buyer?: Buyer;
  known?: Buyer[];
  chooseProducer?: boolean;
  producer?: string | null;
} = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const onShowExisting = vi.fn();
  renderWithProviders(
    <BuyerFormDialog
      buyer={buyer}
      chooseProducer={chooseProducer}
      known={known}
      onClose={onClose}
      onSaved={onSaved}
      onShowExisting={onShowExisting}
      producer={producer}
    />,
  );
  return {
    onSaved,
    onClose,
    onShowExisting,
    dialog: screen.getByRole('dialog'),
  };
}

// Pegar en vez de teclear: un solo evento por campo, para que un formulario de siete campos no
// pase del tiempo de espera con el equipo cargado. La validación es la misma.
const type = async (label: string, text: string) => {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.paste(text);
};

async function fillValid({
  name = 'Cacao Andino S.A.S.',
  document = '900000009',
} = {}) {
  await type('Nombre', name);
  await type('Número de documento', document);
  await userEvent.selectOptions(
    screen.getByLabelText('Tipo de cliente'),
    'exporter',
  );
  await type('Teléfono', '3000000009');
}

const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

describe('BuyerFormDialog, registering', () => {
  it('registers an active buyer with its data and announces it', async () => {
    server.use(csrfHandler, buyerWriteHandler('create', buildBuyer(), bodies));
    const { onSaved, dialog } = renderDialog();

    expect(dialog).toHaveTextContent('Registrar comprador');
    expect(dialog).toHaveTextContent(
      'Quedará disponible para registrar ventas.',
    );
    await fillValid();
    await type('Persona de contacto', 'Persona de Ejemplo');
    await save();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Comprador registrado',
        expect.objectContaining({ id: expect.any(String) }),
      ),
    );
    expect(bodies).toEqual([
      {
        name: 'Cacao Andino S.A.S.',
        document_type: 'NIT',
        identity_document: '900000009',
        buyer_type: 'exporter',
        contact_name: 'Persona de Ejemplo',
        phone: '3000000009',
        email: null,
      },
    ]);
  });

  it('offers the five buyer types in the order of the user story, and NIT first', () => {
    renderDialog();

    const options = within(screen.getByLabelText('Tipo de cliente'))
      .getAllByRole('option')
      .filter((option) => (option as HTMLOptionElement).value)
      .map((option) => option.textContent);
    expect(options).toEqual([
      'Industria chocolatera',
      'Exportador',
      'Intermediario o acopiador',
      'Cooperativa o asociación',
      'Transformador artesanal',
    ]);
    expect(screen.getByLabelText('Tipo de documento')).toHaveValue('NIT');
  });

  it('marks each missing field and sends nothing', async () => {
    const { onSaved, dialog } = renderDialog();

    await save();

    expect(
      await within(dialog).findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText('Campo obligatorio')).toHaveLength(3);
    expect(
      within(dialog).getAllByText('Escribe un teléfono o un correo.'),
    ).toHaveLength(2);
    expect(onSaved).not.toHaveBeenCalled();
    expect(bodies).toEqual([]);
  });

  it('rejects a document with dots before sending', async () => {
    renderDialog();

    await fillValid({ document: '900.000.009' });
    await save();

    expect(
      await screen.findByText('Ingresa solo números, entre 6 y 15 dígitos.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('warns of a document already in the directory without asking the server, and shows that buyer', async () => {
    const { onShowExisting } = renderDialog();

    await fillValid({ document: '900000001' });
    await save();

    expect(
      await screen.findByText(
        'Ya tienes registrado este documento: Chocolates del Oriente S.A.S.',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver el comprador' }),
    );
    expect(onShowExisting).toHaveBeenCalledWith('b1');
  });

  it('accepts the same number with another document type', async () => {
    server.use(csrfHandler, buyerWriteHandler('create', buildBuyer(), bodies));
    const { onSaved } = renderDialog();

    await fillValid({ document: '900000001' });
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de documento'),
      'CC',
    );
    await save();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Comprador registrado',
        expect.objectContaining({ id: expect.any(String) }),
      ),
    );
  });

  it('offers to activate an inactive buyer that the server says has the document', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler(
        'create',
        HttpResponse.json(
          {
            detail: 'Ya tienes registrado un comprador con este documento.',
            code: 'duplicate_document',
            fields: { identity_document: ['Repetido.'] },
            existing: { id: 'b2', name: 'Acopio La Ceiba', is_active: false },
          },
          { status: 409 },
        ),
      ),
      buyerWriteHandler('update', buildBuyer({ id: 'b2' }), bodies),
    );
    const { onSaved, onShowExisting } = renderDialog({ known: [ceiba] });

    await fillValid({ document: '900000002' });
    await save();

    expect(
      await screen.findByText(
        'Ya tienes registrado este documento: Acopio La Ceiba, que está inactivo.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Activarlo' }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Comprador activado',
        expect.objectContaining({ id: expect.any(String) }),
      ),
    );
    expect(bodies).toEqual([{ is_active: true, expected_version: 3 }]);
    expect(onShowExisting).toHaveBeenCalledWith('b2');
  });

  it('warns of a buyer with the same name written another way, and still saves', async () => {
    server.use(csrfHandler, buyerWriteHandler('create', buildBuyer(), bodies));
    const { onSaved } = renderDialog();

    await type('Nombre', 'chocolates del oriente sas');

    expect(
      await screen.findByText(
        'Ya tienes un comprador llamado así, con otro documento.',
      ),
    ).toBeInTheDocument();
    await type('Número de documento', '900000009');
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de cliente'),
      'exporter',
    );
    await type('Correo', 'compras@example.com');
    await save();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Comprador registrado',
        expect.objectContaining({ id: expect.any(String) }),
      ),
    );
  });

  it('puts the errors of the server in their fields', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler(
        'create',
        apiError(400, 'validation_error', 'Datos inválidos.', {
          email: ['Revisa el correo.'],
        }),
      ),
    );
    renderDialog();

    await fillValid();
    await save();

    expect(await screen.findByText('Revisa el correo.')).toBeInTheDocument();
  });

  it('says when the producer is inactive', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler('create', apiError(422, 'producer_inactive')),
    );
    renderDialog();

    await fillValid();
    await save();

    expect(
      await screen.findByText(
        'El productor está inactivo: actívalo antes de registrarle compradores.',
      ),
    ).toBeInTheDocument();
  });
});

describe('BuyerFormDialog, for the technical account', () => {
  // El campo de productor busca mientras se escribe.
  beforeEach(() => {
    server.use(
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json(buildPage([])),
      ),
    );
  });

  it('asks for the producer before sending', async () => {
    renderDialog({ chooseProducer: true });

    await fillValid();
    await save();

    expect(
      await screen.findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('sends the producer chosen in the list', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler('create', buildBuyer(), bodies),
      http.get(apiUrl('/api/producers/:id'), () =>
        HttpResponse.json({
          id: 'p9',
          member_code: '000999',
          first_name: 'Otra',
          last_name: 'Productora',
        }),
      ),
    );
    const { onSaved } = renderDialog({ chooseProducer: true, producer: 'p9' });

    await fillValid();
    await save();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Comprador registrado',
        expect.objectContaining({ id: expect.any(String) }),
      ),
    );
    expect(bodies[0]).toMatchObject({ producer_id: 'p9' });
  });
});

describe('BuyerFormDialog, editing', () => {
  const editing = buildBuyer({
    id: 'b1',
    name: 'Chocolates del Oriente S.A.S.',
    document_type: 'NIT',
    identity_document: '900000001',
    buyer_type: 'chocolate_industry',
    contact_name: null,
    phone: '3000000001',
    email: null,
    version: 4,
  });

  const replace = async (label: string, text: string) => {
    const field = screen.getByLabelText(label);
    await userEvent.clear(field);
    if (!text) return;
    await userEvent.click(field);
    await userEvent.paste(text);
  };

  it('opens with the current data and sends only what changed, with the version read', async () => {
    server.use(csrfHandler, buyerWriteHandler('update', editing, bodies));
    const { onSaved, dialog } = renderDialog({ buyer: editing });

    expect(dialog).toHaveTextContent('Editar comprador');
    expect(screen.getByLabelText('Nombre')).toHaveValue(
      'Chocolates del Oriente S.A.S.',
    );
    expect(screen.getByLabelText('Número de documento')).toHaveValue(
      '900000001',
    );
    await replace('Número de documento', '900000011');
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de cliente'),
      'exporter',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        'Comprador actualizado',
        expect.objectContaining({ id: expect.any(String) }),
      ),
    );
    expect(bodies).toEqual([
      {
        identity_document: '900000011',
        buyer_type: 'exporter',
        expected_version: 4,
      },
    ]);
  });

  it('closes without sending or announcing when nothing really changed', async () => {
    const { onSaved } = renderDialog({ buyer: editing });

    await replace('Nombre', ' Chocolates del Oriente S.A.S. ');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(null));
    expect(bodies).toEqual([]);
  });

  it('does not save when a required field is emptied, or the only contact is removed', async () => {
    const { onSaved, dialog } = renderDialog({ buyer: editing });

    await replace('Nombre', '');
    await replace('Teléfono', '');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await within(dialog).findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Campo obligatorio')).toBeInTheDocument();
    expect(
      within(dialog).getAllByText('Escribe un teléfono o un correo.'),
    ).toHaveLength(2);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not take the document of another buyer', async () => {
    renderDialog({ buyer: editing, known: [editing, ceiba] });

    await userEvent.selectOptions(
      screen.getByLabelText('Tipo de documento'),
      'CC',
    );
    await replace('Número de documento', '1000000002');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText(
        'Ya tienes registrado este documento: Acopio La Ceiba, que está inactivo.',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('loads the current data when another person changed the buyer meanwhile', async () => {
    const current = { ...editing, name: 'Chocolates del Oriente', version: 5 };
    server.use(
      csrfHandler,
      buyerWriteHandler(
        'update',
        HttpResponse.json(
          {
            detail: 'Cambió.',
            code: 'stale_version',
            fields: {},
            current,
          },
          { status: 409 },
        ),
        bodies,
      ),
    );
    renderDialog({ buyer: editing });

    await replace('Persona de contacto', 'Persona de Ejemplo');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText(
        'Otra persona cambió este comprador. Revisa los datos actuales antes de guardar.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue(
      'Chocolates del Oriente',
    );
    expect(screen.getByLabelText('Persona de contacto')).toHaveValue('');
  });

  it('closes at once when cancelled without changes', async () => {
    const { onClose } = renderDialog({ buyer: editing });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('asks before discarding changes, and keeps them on request', async () => {
    const { onClose } = renderDialog({ buyer: editing });

    await replace('Nombre', 'Otro nombre');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    const confirm = await screen.findByRole('dialog', {
      name: '¿Descartar los cambios?',
    });
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Seguir editando' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '¿Descartar los cambios?' }),
      ).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Otro nombre');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar cambios' }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(bodies).toEqual([]);
  });
});
