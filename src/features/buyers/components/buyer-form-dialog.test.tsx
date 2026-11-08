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
  known = [oriente, ceiba],
  chooseProducer = false,
  producer = null,
}: {
  known?: Buyer[];
  chooseProducer?: boolean;
  producer?: string | null;
} = {}) {
  const onSaved = vi.fn();
  const onShowExisting = vi.fn();
  renderWithProviders(
    <BuyerFormDialog
      chooseProducer={chooseProducer}
      known={known}
      onClose={vi.fn()}
      onSaved={onSaved}
      onShowExisting={onShowExisting}
      producer={producer}
    />,
  );
  return { onSaved, onShowExisting, dialog: screen.getByRole('dialog') };
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
      expect(onSaved).toHaveBeenCalledWith('Comprador registrado'),
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
      expect(onSaved).toHaveBeenCalledWith('Comprador registrado'),
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
      expect(onSaved).toHaveBeenCalledWith('Comprador activado'),
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
      expect(onSaved).toHaveBeenCalledWith('Comprador registrado'),
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
      expect(onSaved).toHaveBeenCalledWith('Comprador registrado'),
    );
    expect(bodies[0]).toMatchObject({ producer_id: 'p9' });
  });
});
