import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replace.mockReset();
  });

  it('muestra validaciones y permite alternar la visibilidad de la contraseña', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

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

  it('envía credenciales con cookies y redirige después del éxito', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrf_token: 'test-csrf' })),
      )
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            user: {
              id: '1',
              email: 'persona@example.com',
              roles: ['producer'],
              permissions: [],
            },
          }),
          { status: 200 },
        ),
      );
    render(<LoginForm />);

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'cacao seguro');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/panel'));
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/login',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });

  it('presenta el mensaje devuelto por la API', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrf_token: 'test-csrf' })),
      )
      .mockResolvedValue(
        new Response(
          JSON.stringify({ detail: 'Usuario o contraseña incorrectos' }),
          { status: 401 },
        ),
      );
    render(<LoginForm />);
    await user.selectOptions(screen.getByLabelText('Ingresar con'), 'document');
    await user.type(screen.getByLabelText('Número de documento'), '1090123456');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario o contraseña incorrectos',
    );
  });
});
