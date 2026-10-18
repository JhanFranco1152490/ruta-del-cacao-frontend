import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsDesktop } from '@/hooks/use-is-desktop';

import { useMonthParam } from '@/hooks/use-month-param';
import { useActivityView } from './use-activity-view';

vi.mock('@/hooks/use-is-desktop');

function setup(searchParams = '') {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      {children}
    </NuqsTestingAdapter>
  );
  return {
    onUrlUpdate,
    ...renderHook(
      () => {
        const period = useMonthParam();
        return { period, view: useActivityView(period) };
      },
      { wrapper },
    ),
  };
}

const lastQuery = (onUrlUpdate: ReturnType<typeof setup>['onUrlUpdate']) =>
  onUrlUpdate.mock.lastCall?.[0].queryString;

beforeEach(() => {
  // Miércoles 14 de octubre de 2026; su semana empieza el lunes 12.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T15:00:00Z'));
  vi.mocked(useIsDesktop).mockReturnValue(true);
});

afterEach(() => vi.useRealTimers());

describe('useActivityView', () => {
  it('opens on the month grid on a desktop and on the list on a phone', () => {
    expect(setup().result.current.view.view).toBe('mes');

    vi.mocked(useIsDesktop).mockReturnValue(false);
    expect(setup().result.current.view.view).toBe('lista');
  });

  it('takes the view of the URL over the one by screen size', () => {
    vi.mocked(useIsDesktop).mockReturnValue(false);

    expect(setup('?vista=parcela').result.current.view.view).toBe('parcela');
  });

  it('falls back to the initial view when the URL has one it does not know', () => {
    expect(setup('?vista=zzz').result.current.view.view).toBe('mes');
  });

  it('writes the view in the URL', async () => {
    const { result, onUrlUpdate } = setup();

    act(() => void result.current.view.setView('pendientes'));

    await waitFor(() => expect(result.current.view.view).toBe('pendientes'));
    expect(lastQuery(onUrlUpdate)).toBe('?vista=pendientes');
  });

  it('starts the week on the Monday of the current week', () => {
    const { result } = setup();

    expect(result.current.view.week).toBe('2026-10-12');
    expect(result.current.view.isCurrentWeek).toBe(true);
  });

  it('moves a day of the URL to the Monday of its week', () => {
    expect(setup('?semana=2026-10-21').result.current.view.week).toBe(
      '2026-10-19',
    );
  });

  it('falls back to the current week with a malformed date', () => {
    expect(setup('?semana=zzz').result.current.view.week).toBe('2026-10-12');
    expect(setup('?semana=2026-02-30').result.current.view.week).toBe(
      '2026-10-12',
    );
  });

  it('goes to the previous and next week and back to this one', async () => {
    const { result, onUrlUpdate } = setup();

    act(() => void result.current.view.goNextWeek());
    await waitFor(() => expect(result.current.view.week).toBe('2026-10-19'));
    expect(result.current.view.isCurrentWeek).toBe(false);
    expect(lastQuery(onUrlUpdate)).toBe('?semana=2026-10-19');

    act(() => void result.current.view.goPreviousWeek());
    act(() => void result.current.view.goPreviousWeek());
    await waitFor(() => expect(result.current.view.week).toBe('2026-10-05'));

    act(() => void result.current.view.goThisWeek());
    await waitFor(() => expect(result.current.view.week).toBe('2026-10-12'));
    expect(lastQuery(onUrlUpdate)).toBe('');
  });

  it('counts 14 days in the pending view unless the address says another number', () => {
    expect(setup().result.current.view.pendingDays).toBe(14);
    expect(setup('?dias=30').result.current.view.pendingDays).toBe(30);
  });

  it('falls back to 14 days with a number that is not on the list', () => {
    expect(setup('?dias=15').result.current.view.pendingDays).toBe(14);
    expect(setup('?dias=zzz').result.current.view.pendingDays).toBe(14);
  });

  it('writes the days in the address, and leaves it clean for the usual 14', async () => {
    const { result, onUrlUpdate } = setup();

    act(() => void result.current.view.setPendingDays(60));
    await waitFor(() => expect(result.current.view.pendingDays).toBe(60));
    expect(lastQuery(onUrlUpdate)).toBe('?dias=60');

    act(() => void result.current.view.setPendingDays(14));
    await waitFor(() => expect(result.current.view.pendingDays).toBe(14));
    expect(lastQuery(onUrlUpdate)).toBe('');
  });

  it('opens the week view on the first week of the month that was being seen', async () => {
    const { result } = setup('?mes=2026-12&vista=mes');

    act(() => void result.current.view.setView('semana'));

    await waitFor(() => expect(result.current.view.view).toBe('semana'));
    expect(result.current.view.week).toBe('2026-11-30');
  });

  it('keeps the week that was chosen when it comes back to the week view', async () => {
    const { result } = setup('?mes=2026-12&semana=2026-12-14');

    act(() => void result.current.view.setView('semana'));

    await waitFor(() => expect(result.current.view.view).toBe('semana'));
    expect(result.current.view.week).toBe('2026-12-14');
  });

  it('opens the month view on the month where most of the week falls', async () => {
    // La semana del 30 de noviembre al 6 de diciembre cae casi toda en diciembre (jueves 3).
    const { result } = setup('?vista=semana&semana=2026-11-30');

    act(() => void result.current.view.setView('mes'));

    await waitFor(() => expect(result.current.view.view).toBe('mes'));
    expect(result.current.period.month).toBe('2026-12');
  });
});
