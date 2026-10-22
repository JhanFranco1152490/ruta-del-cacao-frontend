import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/api/accounts';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSessionUser } from '@/test/factories';

import { accountActions, farmAssignerFor } from './account-actions';

const employee = {
  id: 'a1',
  email: 'empleado@example.com',
  first_name: 'Ana',
  last_name: 'Prueba',
  producer: { id: 'p1', member_code: 'PROD-000001', status: 'active' },
  roles: [{ id: 'r1', code: 'foreman', name: 'Capataz' }],
  has_signed_in: false,
} as unknown as Account;
const producerAccount = {
  ...employee,
  id: 'a2',
  roles: [{ id: 'r2', code: 'producer', name: 'Productor' }],
} as unknown as Account;
const manager = buildSessionUser({
  id: 'u1',
  producer_id: null,
  permissions: [
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_CHANGE_STATUS,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.ROLES_VIEW,
  ],
});

describe('accountActions', () => {
  it('offers everything on an employee that never signed in', () => {
    expect(accountActions(employee, manager)).toEqual({
      canUpdate: true,
      canChangeStatus: true,
      canDelete: true,
      canChangeRoles: true,
    });
  });

  it('offers nothing on the own account', () => {
    expect(
      Object.values(accountActions({ ...employee, id: 'u1' }, manager)),
    ).toEqual([false, false, false, false]);
  });

  it('keeps the producer account out of reach from the producer space', () => {
    const fromProducer = { ...manager, producer_id: 'p1' };

    expect(accountActions(producerAccount, fromProducer).canUpdate).toBe(false);
    expect(accountActions(producerAccount, manager)).toMatchObject({
      canUpdate: true,
      canChangeRoles: false,
    });
  });

  it('does not delete an account that already signed in', () => {
    expect(
      accountActions({ ...employee, has_signed_in: true }, manager).canDelete,
    ).toBe(false);
  });
});

describe('farmAssignerFor', () => {
  it('lets whoever reaches every farm assign them, choosing the producer only from the association', () => {
    expect(farmAssignerFor(employee, { ...manager, all_farms: true })).toEqual({
      userId: 'u1',
      producer: 'p1',
    });
    expect(
      farmAssignerFor(employee, {
        ...manager,
        all_farms: true,
        producer_id: 'p1',
      }),
    ).toEqual({ userId: 'u1', producer: undefined });
    expect(farmAssignerFor(employee, { ...manager, all_farms: false })).toBe(
      undefined,
    );
  });
});
