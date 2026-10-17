import { describe, expect, it } from 'vitest';

import { isEmployee } from './employee';

const producerRole = { code: 'producer' };
const foremanRole = { code: 'foreman' };

describe('isEmployee', () => {
  it('takes an account with a producer and a role other than Productor as an employee', () => {
    expect(isEmployee({ producer_id: 'p1', roles: [foremanRole] })).toBe(true);
  });

  it('takes a custom role, which has no code, as an employee', () => {
    expect(isEmployee({ producer_id: 'p1', roles: [{ code: null }] })).toBe(
      true,
    );
  });

  it('does not take the Productor as an employee', () => {
    expect(isEmployee({ producer_id: 'p1', roles: [producerRole] })).toBe(
      false,
    );
  });

  it('does not take an account without a producer as an employee', () => {
    expect(isEmployee({ producer_id: null, roles: [foremanRole] })).toBe(false);
  });

  it('does not take a superuser as an employee', () => {
    expect(
      isEmployee({
        producer_id: 'p1',
        is_superuser: true,
        roles: [foremanRole],
      }),
    ).toBe(false);
  });

  it('takes nobody as an employee while the session is not loaded', () => {
    expect(isEmployee(undefined)).toBe(false);
    expect(isEmployee(null)).toBe(false);
  });
});
