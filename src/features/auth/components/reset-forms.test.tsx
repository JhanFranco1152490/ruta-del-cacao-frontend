import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { RATE_LIMIT_MESSAGE } from '@/lib/api/errors';
import { apiError } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { ResetConfirmForm } from './reset-confirm-form';
import { ResetRequestForm } from './reset-request-form';

const REQUEST = apiUrl('/api/auth/password-reset/request');
const CONFIRM = apiUrl('/api/auth/password-reset/confirm');

describe('ResetRequestForm', () => {
  it('validates the email before sending', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetRequestForm />);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(
      screen.getByText('Ingresa tu correo electrónico.'),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'no-es-correo',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(
      screen.getByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument();
  });

  it('keeps the response indistinguishable when asking for recovery', async () => {
    let body: unknown;
    server.use(
      http.post(REQUEST, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetRequestForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      ' persona@example.com ',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el correo está registrado',
    );
    expect(body).toEqual({ email: 'persona@example.com' });
  });

  it('disables the button while waiting and sends only one request', async () => {
    let calls = 0;
    server.use(
      http.post(REQUEST, async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetRequestForm />);
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    const pending = await screen.findByRole('button', { name: 'Procesando…' });
    expect(pending).toBeDisabled();
    await user.click(pending);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el correo está registrado',
    );
    expect(calls).toBe(1);
  });

  it('drops the success message when the next submit fails validation', async () => {
    server.use(
      http.post(REQUEST, () => new HttpResponse(null, { status: 202 })),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetRequestForm />);
    const email = screen.getByLabelText('Correo electrónico');
    await user.type(email, 'persona@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByRole('status');

    await user.clear(email);
    await user.type(email, 'no-es-correo');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(
      screen.getByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the connection message under the email field on a network error', async () => {
    server.use(http.post(REQUEST, () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithProviders(<ResetRequestForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(
      await screen.findByText(
        'No pudimos enviar la solicitud. Revisa tu conexión.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the rate limit message on a 429', async () => {
    server.use(
      http.post(REQUEST, () =>
        apiError(429, 'throttled', 'Request was throttled.'),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetRequestForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText(RATE_LIMIT_MESSAGE)).toBeInTheDocument();
  });
});

describe('ResetConfirmForm', () => {
  const link = { uid: 'uid-de-prueba', token: 'token-de-prueba' };

  async function fill(
    user: ReturnType<typeof userEvent.setup>,
    password: string,
    confirmation = password,
  ) {
    await user.type(screen.getByLabelText('Nueva contraseña'), password);
    await user.type(
      screen.getByLabelText('Confirma tu nueva contraseña'),
      confirmation,
    );
    await user.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    );
  }

  it.each([
    ['without uid', { token: 'token-de-prueba' }],
    ['without token', { uid: 'uid-de-prueba' }],
    ['without either', {}],
  ])('handles an invalid link %s without showing the form', (_case, props) => {
    renderWithProviders(<ResetConfirmForm {...props} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El enlace de recuperación no es válido',
    );
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Solicitar un enlace nuevo' }),
    ).toHaveAttribute('href', '/recuperar-contrasena');
  });

  it('validates the policy and the confirmation before updating', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, '12345678', '87654321');

    expect(
      screen.getByText('La contraseña no puede contener solo números.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Las contraseñas no coinciden.'),
    ).toBeInTheDocument();
  });

  it('rejects a password outside the allowed length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'corta');

    expect(
      screen.getByText('La contraseña debe tener entre 8 y 50 caracteres.'),
    ).toBeInTheDocument();
  });

  it('confirms the recovery and offers the way back to login', async () => {
    let body: unknown;
    server.use(
      http.post(CONFIRM, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu contraseña fue actualizada',
    );
    expect(
      screen.getByRole('link', { name: 'Ir al inicio de sesión' }),
    ).toHaveAttribute('href', '/');
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    expect(body).toEqual({
      ...link,
      new_password: 'Cacao seguro',
      new_password_confirmation: 'Cacao seguro',
    });
  });

  it('disables the button while waiting and sends only one request', async () => {
    let calls = 0;
    server.use(
      http.post(CONFIRM, async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');
    const pending = await screen.findByRole('button', { name: 'Procesando…' });
    expect(pending).toBeDisabled();
    await user.click(pending);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu contraseña fue actualizada',
    );
    expect(calls).toBe(1);
  });

  it('shows the server message and removes the form for a used or expired token', async () => {
    server.use(
      http.post(CONFIRM, () =>
        apiError(
          400,
          'invalid_reset_token',
          'El enlace de recuperación venció.',
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace de recuperación venció.',
    );
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actualizar contraseña' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Solicitar un enlace nuevo' }),
    ).toHaveAttribute('href', '/recuperar-contrasena');
  });

  it('drops the previous server message when the next submit fails validation', async () => {
    server.use(
      http.post(CONFIRM, () =>
        apiError(429, 'throttled', 'Request was throttled.'),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);
    await fill(user, 'Cacao seguro');
    await screen.findByText(RATE_LIMIT_MESSAGE);

    await user.clear(screen.getByLabelText('Nueva contraseña'));
    await user.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    );

    expect(screen.queryByText(RATE_LIMIT_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
  });

  it('shows the fallback message when the request fails without a response', async () => {
    server.use(http.post(CONFIRM, () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace no es válido o venció. Solicita uno nuevo.',
    );
  });

  it('shows a password error from the server on the password field', async () => {
    server.use(
      http.post(CONFIRM, () =>
        apiError(400, 'validation_error', 'Datos inválidos.', {
          new_password: ['Esta contraseña es demasiado común.'],
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');

    const field = screen.getByLabelText('Nueva contraseña');
    await screen.findByText('Esta contraseña es demasiado común.');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(
      'Esta contraseña es demasiado común.',
    );
    expect(screen.queryByText('Datos inválidos.')).not.toBeInTheDocument();
  });

  it('shows a confirmation error from the server on the confirmation field', async () => {
    server.use(
      http.post(CONFIRM, () =>
        apiError(400, 'validation_error', 'Datos inválidos.', {
          new_password_confirmation: ['Las contraseñas no coinciden.'],
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');

    const field = screen.getByLabelText('Confirma tu nueva contraseña');
    await screen.findByText('Las contraseñas no coinciden.');
    expect(field).toHaveAccessibleDescription('Las contraseñas no coinciden.');
    expect(screen.getByLabelText('Nueva contraseña')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('falls back to the general notice when the server names no field of the form', async () => {
    server.use(
      http.post(CONFIRM, () =>
        apiError(
          400,
          'validation_error',
          'Los datos enviados no son válidos.',
          {
            uid: ['Valor no válido.'],
          },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetConfirmForm {...link} />);

    await fill(user, 'Cacao seguro');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Los datos enviados no son válidos.',
    );
  });
});
