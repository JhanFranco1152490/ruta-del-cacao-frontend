import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LotStatus } from '@/lib/lot-status';

import { currentStage, stageOf, useStagePicker } from './stage-picker';

describe('currentStage', () => {
  it.each([
    ['generated', 'fermentation'],
    ['fermenting', 'fermentation'],
    ['fermented', 'drying'],
    ['drying', 'drying'],
    ['dried', 'quality'],
    ['evaluated', 'quality'],
    ['classified', 'warehouse'],
    ['in_warehouse', 'warehouse'],
    ['discarded', 'quality'],
  ] as const)('shows %s on %s', (status, stage) => {
    expect(currentStage(status)).toBe(stage);
  });
});

describe('stageOf', () => {
  it('marks the earlier stages as done, the lot one as current and the rest as pending', () => {
    expect(stageOf('fermentation', 'drying')).toBe('done');
    expect(stageOf('drying', 'drying')).toBe('current');
    expect(stageOf('quality', 'drying')).toBe('pending');
  });

  it('keeps quality done and warehouse current once the lot is classified', () => {
    expect(stageOf('quality', 'classified')).toBe('done');
    expect(stageOf('warehouse', 'classified')).toBe('current');
  });

  it('leaves warehouse pending while the lot is still in quality', () => {
    expect(stageOf('quality', 'evaluated')).toBe('current');
    expect(stageOf('warehouse', 'evaluated')).toBe('pending');
  });
});

describe('useStagePicker', () => {
  it('selects the stage of the lot status and no other', () => {
    const { result } = renderHook(() => useStagePicker('fermenting'));

    expect(result.current.items.of('fermentation').selected).toBe(true);
    expect(result.current.items.of('drying').selected).toBe(false);
    expect(result.current.items.of('quality').selected).toBe(false);
    expect(result.current.items.of('warehouse').selected).toBe(false);
  });

  it('gives the item and the panel of a stage the same selection', () => {
    const { result } = renderHook(() => useStagePicker('dried'));

    expect(result.current.items.of('quality')).toMatchObject({
      as: 'item',
      selected: true,
      stage: 'current',
    });
    expect(result.current.panels.of('quality')).toMatchObject({
      as: 'panel',
      selected: true,
    });
  });

  it('changes the selected stage for both when one is picked', () => {
    const { result } = renderHook(() => useStagePicker('dried'));

    act(() => result.current.items.of('drying').onSelect());

    expect(result.current.panels.of('drying').selected).toBe(true);
    expect(result.current.items.of('quality').selected).toBe(false);
  });

  it('opens a classified lot on its warehouse stage', () => {
    const { result } = renderHook(() => useStagePicker('classified'));

    expect(result.current.items.of('warehouse')).toMatchObject({
      selected: true,
      stage: 'current',
    });
    expect(result.current.items.of('quality').stage).toBe('done');
  });

  it('moves to the new stage when the lot changes status', () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: LotStatus }) => useStagePicker(status),
      { initialProps: { status: 'fermenting' as LotStatus } },
    );

    rerender({ status: 'fermented' });

    expect(result.current.items.of('drying').selected).toBe(true);
    expect(result.current.items.of('fermentation').selected).toBe(false);
  });
});
