import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useActivityDay } from './use-activity-day';

function setup(month: string, searchParams = '') {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      hasMemory
      onUrlUpdate={onUrlUpdate}
      searchParams={searchParams}
    >
      {children}
    </NuqsTestingAdapter>
  );
  return {
    onUrlUpdate,
    ...renderHook(() => useActivityDay(month, '2026-10-22'), { wrapper }),
  };
}

describe('useActivityDay', () => {
  it('starts on today when it is in the month that is seen', () => {
    expect(setup('2026-10').result.current.day).toBe('2026-10-22');
  });

  it('starts on the first day of a month that is not the current one', () => {
    expect(setup('2026-12').result.current.day).toBe('2026-12-01');
  });

  it('takes the day of the address when it belongs to the month', () => {
    expect(setup('2026-10', '?dia=2026-10-05').result.current.day).toBe(
      '2026-10-05',
    );
  });

  it('ignores a day of the address that belongs to another month', () => {
    expect(setup('2026-11', '?dia=2026-10-05').result.current.day).toBe(
      '2026-11-01',
    );
  });

  it('ignores a malformed day', () => {
    expect(setup('2026-10', '?dia=zzz').result.current.day).toBe('2026-10-22');
    expect(setup('2026-10', '?dia=2026-10-40').result.current.day).toBe(
      '2026-10-22',
    );
  });

  it('writes the chosen day in the address and leaves it clean for the usual one', async () => {
    const { result, onUrlUpdate } = setup('2026-10');

    act(() => void result.current.setDay('2026-10-05'));
    await waitFor(() => expect(result.current.day).toBe('2026-10-05'));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?dia=2026-10-05');

    act(() => void result.current.setDay('2026-10-22'));
    await waitFor(() => expect(result.current.day).toBe('2026-10-22'));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('');
  });
});
