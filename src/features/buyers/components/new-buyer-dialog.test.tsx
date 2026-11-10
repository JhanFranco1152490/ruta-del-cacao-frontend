import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildBuyer, buildSession } from '@/test/factories';
import { buyersHandler, buyerWriteHandler, csrfHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { NewBuyerDialog } from './new-buyer-dialog';

const oriente = buildBuyer({
  id: 'b1',
  name: 'Chocolates del Oriente S.A.S.',
  document_type: 'NIT',
  identity_document: '900000001',
});

let bodies: unknown[];

beforeEach(() => {
  bodies = [];
  server.use(csrfHandler, buyersHandler([oriente]));
});

function renderDialog() {
  const onDone = vi.fn();
  const onClose = vi.fn();
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `new-buyer-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.BUYERS_VIEW, PERMISSIONS.BUYERS_ADD],
    }),
  );
  renderWithProviders(
    <NewBuyerDialog
      chooseProducer={false}
      existingLabel="Elegir este comprador"
      onClose={onClose}
      onDone={onDone}
      producer={null}
    />,
    { queryClient },
  );
  return { onDone, onClose };
}

// Pegar en vez de teclear: un evento por campo, para no pasar del tiempo de espera con carga.
const type = async (label: string, text: string) => {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.paste(text);
};

async function fillBuyer(document: string) {
  await type('Nombre', 'Cacao Andino S.A.S.');
  await type('Número de documento', document);
  await userEvent.selectOptions(
    screen.getByLabelText('Tipo de cliente'),
    'exporter',
  );
  await type('Teléfono', '3000000009');
}

const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

describe('NewBuyerDialog', () => {
  it('hands back the buyer it registered and closes', async () => {
    server.use(
      buyerWriteHandler(
        'create',
        buildBuyer({ id: 'b9', name: 'Cacao Andino S.A.S.' }),
        bodies,
      ),
    );
    const { onDone, onClose } = renderDialog();

    await fillBuyer('900000009');
    await save();

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('b9'));
    expect(onClose).toHaveBeenCalled();
    expect(bodies).toHaveLength(1);
  });

  it('offers the buyer that already has the document instead of registering it twice', async () => {
    const { onDone, onClose } = renderDialog();
    // Con el directorio leído, el documento repetido se avisa antes de enviar: sin handler de
    // registro, un envío haría fallar la prueba.
    await screen.findByRole('dialog');

    await fillBuyer('900000001');
    await save();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Elegir este comprador' }),
    );

    expect(onDone).toHaveBeenCalledWith('b1');
    expect(onClose).toHaveBeenCalled();
    expect(bodies).toEqual([]);
  });

  it('does not hand back anything when the server rejects the buyer', async () => {
    server.use(
      buyerWriteHandler(
        'create',
        apiError(400, 'validation_error', 'Revisa los datos.'),
      ),
    );
    const { onDone, onClose } = renderDialog();

    await fillBuyer('900000009');
    await save();

    await screen.findByText('Revisa los datos.');
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
