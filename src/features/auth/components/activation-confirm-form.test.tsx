import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiError } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { ActivationConfirmForm } from './activation-confirm-form';

async function submit() {
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText('Nueva contraseña'),
    'Una frase segura',
  );
  await user.type(
    screen.getByLabelText('Confirma tu nueva contraseña'),
    'Una frase segura',
  );
  await user.click(screen.getByRole('button', { name: 'Activar cuenta' }));
}

describe('ActivationConfirmForm', () => {
  it('does not send mismatched passwords', async () => {
    renderWithProviders(<ActivationConfirmForm uid="u" token="t" />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText('Nueva contraseña'),
      'Una frase segura',
    );
    await user.type(
      screen.getByLabelText('Confirma tu nueva contraseña'),
      'Otra frase segura',
    );
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }));
    expect(
      await screen.findByText('Las contraseñas no coinciden.'),
    ).toBeInTheDocument();
  });

  it('sends only one activation while waiting, even if submitted again', async () => {
    let calls = 0;
    let release!: () => void;
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(apiUrl('/api/auth/activation/confirm'), async () => {
        calls++;
        await response;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<ActivationConfirmForm uid="u" token="t" />);
    await submit();
    await waitFor(() => expect(calls).toBe(1));
    const button = screen.getByRole('button', { name: 'Procesando…' });
    expect(button).toBeDisabled();
    fireEvent.submit(button.closest('form')!);
    release();
    await screen.findByText(
      'Tu cuenta fue activada. Ya puedes iniciar sesión.',
    );
    expect(calls).toBe(1);
  });

  it('allows retrying after a network failure', async () => {
    server.use(
      http.post(apiUrl('/api/auth/activation/confirm'), () =>
        HttpResponse.error(),
      ),
    );
    renderWithProviders(<ActivationConfirmForm uid="u" token="t" />);
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Revisa tu conexión',
    );
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue(
      'Una frase segura',
    );
    server.use(
      http.post(
        apiUrl('/api/auth/activation/confirm'),
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Activar cuenta' }),
    );
    expect(
      await screen.findByText(
        'Tu cuenta fue activada. Ya puedes iniciar sesión.',
      ),
    ).toBeInTheDocument();
  });

  it.each([{ uid: 'u' }, { token: 't' }, { uid: 'u', token: '' }])(
    'rejects incomplete links %o',
    (props) => {
      renderWithProviders(<ActivationConfirmForm {...props} />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'pide a quien creó tu cuenta',
      );
      expect(
        screen.queryByLabelText('Nueva contraseña'),
      ).not.toBeInTheDocument();
    },
  );

  it('activates with the password and offers login without opening a session', async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/auth/activation/confirm'), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<ActivationConfirmForm uid="u" token="t" />);
    await submit();
    expect(
      await screen.findByText(
        'Tu cuenta fue activada. Ya puedes iniciar sesión.',
      ),
    ).toBeInTheDocument();
    expect(body).toEqual({
      uid: 'u',
      token: 't',
      new_password: 'Una frase segura',
      new_password_confirmation: 'Una frase segura',
    });
    expect(
      screen.getByRole('link', { name: 'Ir al inicio de sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion');
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
  });

  it('explains how to replace a used or expired token and removes the form', async () => {
    server.use(
      http.post(apiUrl('/api/auth/activation/confirm'), () =>
        apiError(400, 'invalid_activation_token'),
      ),
    );
    renderWithProviders(<ActivationConfirmForm uid="u" token="t" />);
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'pide a quien creó tu cuenta',
    );
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Activar cuenta' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Solicitar un enlace nuevo' }),
    ).not.toBeInTheDocument();
  });

  it('shows password policy errors beside the field', async () => {
    server.use(
      http.post(apiUrl('/api/auth/activation/confirm'), () =>
        apiError(400, 'validation_error', 'Datos inválidos.', {
          new_password: ['La contraseña es demasiado común.'],
        }),
      ),
    );
    renderWithProviders(<ActivationConfirmForm uid="u" token="t" />);
    await submit();
    expect(
      await screen.findByText('La contraseña es demasiado común.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
