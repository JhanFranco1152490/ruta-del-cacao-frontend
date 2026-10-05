import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import { buildPage, buildProducer, buildSessionUser } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { AccountTypeStep } from './account-type-step';

const producerId = '33333333-3333-4333-8333-333333333333';
const listItem = (id: string, first_name: string, member_code: string) => ({
  id,
  member_code,
  document_type: 'CC',
  identity_document: '1234567890',
  first_name,
  last_name: 'Prueba',
  municipality_code: '54001',
  status: 'active',
});
function mockProducer() {
  server.use(
    http.get(apiUrl(`/api/producers/${producerId}`), () =>
      HttpResponse.json(
        buildProducer({
          id: producerId,
          first_name: 'Ana',
          member_code: 'PROD-000007',
        }),
      ),
    ),
  );
}

const user = buildSessionUser({
  producer_id: null,
  permissions: [PERMISSIONS.USERS_CREATE, PERMISSIONS.PRODUCERS_VIEW],
});

beforeEach(() => {
  server.use(
    http.get(apiUrl('/api/producers'), () =>
      HttpResponse.json(
        buildPage([listItem(producerId, 'Ana', 'PROD-000007')]),
      ),
    ),
  );
});

describe('AccountTypeStep', () => {
  it('creates an administrator account by default', async () => {
    const onChoose = vi.fn();
    renderWithProviders(<AccountTypeStep user={user} onChoose={onChoose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(onChoose).toHaveBeenCalledWith(undefined);
  });

  it('asks for the producer of an employee', async () => {
    mockProducer();
    const onChoose = vi.fn();
    renderWithProviders(<AccountTypeStep user={user} onChoose={onChoose} />);

    await userEvent.click(screen.getByLabelText('Empleado de un productor'));
    await userEvent.click(screen.getByLabelText('Productor'));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Ana Prueba · PROD-000007' }),
    );
    const next = screen.getByRole('button', { name: 'Continuar' });
    await waitFor(() => expect(next).toBeEnabled());
    await userEvent.click(next);

    expect(onChoose).toHaveBeenCalledWith(producerId);
  });

  it('does not continue as an employee until a producer is chosen', async () => {
    renderWithProviders(<AccountTypeStep user={user} onChoose={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Empleado de un productor'));

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('continues with the chosen producer whatever the association access flag says', async () => {
    mockProducer();
    const onChoose = vi.fn();
    renderWithProviders(
      <AccountTypeStep
        user={user}
        initialProducer={producerId}
        onChoose={onChoose}
      />,
    );

    const next = screen.getByRole('button', { name: 'Continuar' });
    expect(next).toBeEnabled();
    await userEvent.click(next);

    expect(onChoose).toHaveBeenCalledWith(producerId);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('starts with the producer of the list filter', async () => {
    mockProducer();
    renderWithProviders(
      <AccountTypeStep
        user={user}
        initialProducer={producerId}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Empleado de un productor')).toBeChecked();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled(),
    );
  });

  it('offers only administrators without permission to see producers', () => {
    renderWithProviders(
      <AccountTypeStep
        user={{ ...user, permissions: [PERMISSIONS.USERS_CREATE] }}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Empleado de un productor')).toBeDisabled();
    expect(
      screen.getByText(
        'Para crear empleados necesitas permiso para consultar productores.',
      ),
    ).toBeInTheDocument();
  });
});
