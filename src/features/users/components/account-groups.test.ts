import { describe, expect, it } from 'vitest';

import { buildSessionUser } from '@/test/factories';

import type { Account } from '../api';
import { groupAccounts } from './account-groups';

const producer = (id: string, code: string, first: string) => ({
  id,
  member_code: code,
  first_name: first,
  last_name: 'Prueba',
  status: 'active' as const,
  municipality_code: '54001',
});

const account = (id: string, owner: Account['producer']): Account =>
  ({ ...buildSessionUser(), id, producer: owner }) as unknown as Account;

describe('groupAccounts', () => {
  it('gathers the accounts of each producer under its name and code', () => {
    const ana = producer('p1', 'PROD-000001', 'Ana');
    const beto = producer('p2', 'PROD-000002', 'Beto');

    const groups = groupAccounts([
      account('a1', ana),
      account('a2', ana),
      account('a3', beto),
    ]);

    expect(groups.map((group) => group.title)).toEqual([
      'Ana Prueba · PROD-000001',
      'Beto Prueba · PROD-000002',
    ]);
    expect(groups.map((group) => group.accounts.length)).toEqual([2, 1]);
  });

  it('puts the accounts without a producer in the association group', () => {
    const groups = groupAccounts([account('a1', null)]);

    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Asociación');
  });

  it('returns no groups for an empty page', () => {
    expect(groupAccounts([])).toEqual([]);
  });
});
