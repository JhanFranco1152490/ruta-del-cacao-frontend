import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { apiError } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { ActivationDelivery } from './activation-delivery';

const ID = '11111111-1111-4111-8111-111111111111';
const RESEND = apiUrl(`/api/users/${ID}/resend-activation`);
const ACCOUNT = apiUrl(`/api/users/${ID}`);

type Props = Partial<React.ComponentProps<typeof ActivationDelivery>>;

function renderDelivery(props: Props = {}) {
  const onBusy = vi.fn();
  renderWithProviders(
    <ActivationDelivery
      canChangeEmail
      canResend
      email="mal-escrito@example.com"
      id={ID}
      onBusy={onBusy}
      {...props}
    />,
  );
  return { onBusy, user: userEvent.setup() };
}

function serveSend(sent = true) {
  const calls = { resend: 0, patch: [] as unknown[] };
  server.use(
    http.post(RESEND, () => {
      calls.resend += 1;
      return HttpResponse.json({ activation_email_sent: sent });
    }),
    http.patch(ACCOUNT, async ({ request }) => {
      const body = (await request.json()) as { email: string };
      calls.patch.push(body);
      return HttpResponse.json({ id: ID, email: body.email });
    }),
  );
  return calls;
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Cambiar correo' }));
  return screen.findByRole('dialog', { name: 'Cambiar correo de activación' });
}

describe('ActivationDelivery', () => {
  it('reminds to look in spam once the email went out, and not before', () => {
    renderDelivery({ sent: true });
    expect(screen.getByRole('status')).toHaveTextContent('carpeta de spam');
  });

  it('does not talk about spam when nothing was sent', () => {
    renderDelivery({ sent: false });
    expect(screen.getByRole('status')).not.toHaveTextContent('spam');
  });

  it('lets the email be sent again even after it went out', async () => {
    const calls = serveSend();
    const { user } = renderDelivery({ sent: true });

    expect(screen.getByText('Correo enviado')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Reenviar activación' }),
    );

    await waitFor(() => expect(calls.resend).toBe(1));
    expect(await screen.findByText('Correo enviado')).toBeVisible();
  });

  it('offers neither action to whoever cannot update accounts', () => {
    renderDelivery({ canResend: false, canChangeEmail: false });

    expect(
      screen.queryByRole('button', { name: 'Reenviar activación' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cambiar correo' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Solicita el reenvío a una persona con permiso/),
    ).toBeVisible();
  });

  it('points to the record when the email is not changed from here', () => {
    renderDelivery({
      canChangeEmail: false,
      changeEmailHint: 'Para cambiar el correo, edita el expediente.',
    });

    expect(
      screen.queryByRole('button', { name: 'Cambiar correo' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Para cambiar el correo, edita el expediente.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Reenviar activación' }),
    ).toBeVisible();
  });
});

describe('ActivationDelivery: changing the email before the account is activated', () => {
  it('saves the new email and sends the activation to it', async () => {
    const calls = serveSend();
    const { user, onBusy } = renderDelivery();
    const dialog = await openDialog(user);

    const field = within(dialog).getByLabelText('Correo');
    expect(field).toHaveValue('mal-escrito@example.com');
    await user.clear(field);
    await user.type(field, ' Correcto@Example.com ');
    await user.click(
      within(dialog).getByRole('button', { name: 'Guardar y reenviar' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(calls.patch).toEqual([{ email: 'correcto@example.com' }]);
    expect(calls.resend).toBe(1);
    expect(await screen.findByText('Correo enviado')).toBeVisible();
    expect(onBusy).toHaveBeenCalledWith(true);
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });

  it('asks for a valid email that is different from the current one', async () => {
    const calls = serveSend();
    const { user } = renderDelivery();
    const dialog = await openDialog(user);
    const save = within(dialog).getByRole('button', {
      name: 'Guardar y reenviar',
    });

    await user.clear(within(dialog).getByLabelText('Correo'));
    await user.type(within(dialog).getByLabelText('Correo'), 'no-es-un-correo');
    await user.click(save);
    expect(
      await within(dialog).findByText('Ingresa un correo electrónico válido.'),
    ).toBeVisible();

    await user.clear(within(dialog).getByLabelText('Correo'));
    await user.type(
      within(dialog).getByLabelText('Correo'),
      'MAL-escrito@example.com',
    );
    await user.click(save);
    expect(
      await within(dialog).findByText('Ingresa un correo distinto al actual.'),
    ).toBeVisible();
    expect(calls.patch).toEqual([]);
    expect(calls.resend).toBe(0);
  });

  it('says so and sends nothing when another account already has that email', async () => {
    const calls = serveSend();
    server.use(http.patch(ACCOUNT, () => apiError(409, 'duplicate_email')));
    const { user } = renderDelivery();
    const dialog = await openDialog(user);

    await user.clear(within(dialog).getByLabelText('Correo'));
    await user.type(
      within(dialog).getByLabelText('Correo'),
      'tomado@example.com',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Guardar y reenviar' }),
    );

    expect(
      await within(dialog).findByText('Ya existe una cuenta con este correo.'),
    ).toBeVisible();
    expect(calls.resend).toBe(0);
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('keeps the new email and offers to send again when the email could not go out', async () => {
    serveSend(false);
    const { user } = renderDelivery();
    const dialog = await openDialog(user);

    await user.clear(within(dialog).getByLabelText('Correo'));
    await user.type(
      within(dialog).getByLabelText('Correo'),
      'correcto@example.com',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Guardar y reenviar' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Correo pendiente de envío')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Reenviar activación' }),
    ).toBeVisible();
  });
});
