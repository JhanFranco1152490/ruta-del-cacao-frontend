import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { RoleScopeField } from './role-scope-field';

function renderField(allFarms: boolean, onChange = vi.fn()) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ all_farms: allFarms }),
  );
  renderWithProviders(<RoleScopeField onChange={onChange} value="many" />, {
    queryClient,
  });
  return onChange;
}

describe('RoleScopeField', () => {
  it('offers the three scopes and reports the one chosen', async () => {
    const onChange = renderField(true);

    await userEvent.click(
      screen.getByRole('radio', { name: /Una sola finca/ }),
    );
    await userEvent.click(
      screen.getByRole('radio', { name: /Siempre todas las fincas/ }),
    );

    expect(onChange.mock.calls).toEqual([['one'], ['all']]);
    expect(
      screen.getByRole('radio', { name: /Una o varias fincas/ }),
    ).toBeChecked();
  });

  it('does not let someone limited to some farms give «siempre todas»', () => {
    renderField(false);

    expect(
      screen.getByRole('radio', { name: /Siempre todas las fincas/ }),
    ).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Una sola finca/ })).toBeEnabled();
  });
});
