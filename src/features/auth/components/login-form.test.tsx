import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { LoginForm } from './login-form';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const LOGIN = apiUrl('/api/auth/login');
const session = buildSession();

beforeEach(() => vi.clearAllMocks());

describe('LoginForm', () => {
  it('shows validation messages and toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(
      screen.getByText('Ingresa tu correo electrónico.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();

    const password = screen.getByLabelText('Contraseña');
    await user.type(password, 'cacao seguro');
    await user.click(
      screen.getByRole('button', { name: 'Mostrar contraseña' }),
    );
    expect(password).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Ocultar contraseña' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('logs in with email and goes to the panel', async () => {
    let body: unknown;
    server.use(
      http.post(LOGIN, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(session);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'cacao seguro');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/panel'));
    expect(body).toEqual({
      login_method: 'email',
      email: 'persona@example.com',
      password: 'cacao seguro',
    });
  });

  it('logs in with document type and number', async () => {
    let body: unknown;
    server.use(
      http.post(LOGIN, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(session);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.selectOptions(screen.getByLabelText('Ingresar con'), 'document');
    await user.selectOptions(screen.getByLabelText('Documento'), 'CE');
    await user.type(screen.getByLabelText('Número de documento'), '1090123456');
    await user.type(screen.getByLabelText('Contraseña'), 'cacao seguro');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/panel'));
    expect(body).toEqual({
      login_method: 'document',
      document_type: 'CE',
      identity_document: '1090123456',
      password: 'cacao seguro',
    });
  });

  it('shows the server message and stays on the page', async () => {
    server.use(
      http.post(LOGIN, () =>
        apiError(
          401,
          'invalid_credentials',
          'Usuario o contraseña incorrectos.',
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario o contraseña incorrectos.',
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the lockout message', async () => {
    server.use(
      http.post(LOGIN, () =>
        apiError(
          403,
          'account_locked',
          'La cuenta está bloqueada temporalmente.',
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'x');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'bloqueada temporalmente',
    );
  });

  it('disables the button while the request is in flight (no double submit)', async () => {
    let calls = 0;
    server.use(
      http.post(LOGIN, async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(session);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'cacao seguro');

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    const pending = await screen.findByRole('button', { name: 'Procesando…' });
    expect(pending).toBeDisabled();
    await user.click(pending);

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(calls).toBe(1);
  });
});
