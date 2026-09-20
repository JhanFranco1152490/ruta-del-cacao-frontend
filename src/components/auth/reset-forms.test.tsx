import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetConfirmForm } from './reset-confirm-form';
import { ResetRequestForm } from './reset-request-form';

describe('password recovery', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('mantiene una respuesta indistinguible al solicitar recuperación', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    render(<ResetRequestForm />);
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'persona@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el correo está registrado',
    );
  });

  it('valida la política y la confirmación antes de actualizar', async () => {
    const user = userEvent.setup();
    render(<ResetConfirmForm token="token-seguro" />);
    await user.type(screen.getByLabelText('Nueva contraseña'), '12345678');
    await user.type(
      screen.getByLabelText('Confirma tu nueva contraseña'),
      '87654321',
    );
    await user.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    );
    expect(
      screen.getByText('La contraseña no puede contener solo números.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Las contraseñas no coinciden.'),
    ).toBeInTheDocument();
  });

  it('confirma la recuperación y evita envíos duplicados mientras espera', async () => {
    const user = userEvent.setup();
    let finishRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        }),
    );
    render(<ResetConfirmForm token="token-seguro" />);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Cacao seguro');
    await user.type(
      screen.getByLabelText('Confirma tu nueva contraseña'),
      'Cacao seguro',
    );
    await user.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    );

    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
    finishRequest?.(new Response(null, { status: 204 }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu contraseña fue actualizada',
    );
    expect(
      screen.getByRole('link', { name: 'Ir al inicio de sesión' }),
    ).toHaveAttribute('href', '/');
  });

  it('maneja enlaces inválidos sin mostrar el formulario', () => {
    render(<ResetConfirmForm token="" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El enlace de recuperación no es válido',
    );
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
  });
});
