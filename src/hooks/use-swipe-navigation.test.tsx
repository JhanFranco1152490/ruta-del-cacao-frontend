import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SWIPE_MIN_DISTANCE } from '@/lib/swipe';

import { SWIPE_LEAVE_MS, useSwipeNavigation } from './use-swipe-navigation';

function Area({
  onPrevious,
  onNext,
  enabled = true,
}: {
  onPrevious: () => void;
  onNext: () => void;
  enabled?: boolean;
}) {
  const { handlers, offset, phase } = useSwipeNavigation({
    onPrevious,
    onNext,
    enabled,
  });
  return (
    <div
      data-offset={offset}
      data-phase={phase}
      data-testid="area"
      {...handlers}
    >
      <span data-no-swipe="">no se desliza</span>
      <span>sí se desliza</span>
    </div>
  );
}

const touch = (x: number, y = 100) => ({ clientX: x, clientY: y });
const start = (target: Element, x: number, y = 100) =>
  fireEvent.touchStart(target, { touches: [touch(x, y)] });
const move = (target: Element, x: number, y = 100) =>
  fireEvent.touchMove(target, { touches: [touch(x, y)] });
const end = (target: Element, x: number, y = 100) =>
  fireEvent.touchEnd(target, { changedTouches: [touch(x, y)] });
const swipe = (target: Element, fromX: number, toX: number, toY = 100) => {
  start(target, fromX);
  end(target, toX, toY);
};
const offsetOf = () =>
  Number(screen.getByTestId('area').getAttribute('data-offset'));
const phaseOf = () => screen.getByTestId('area').getAttribute('data-phase');
const settle = () =>
  new Promise((resolve) => setTimeout(resolve, SWIPE_LEAVE_MS + 60));

describe('useSwipeNavigation', () => {
  it('goes to the next period when the finger goes left, and to the previous when it goes right', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={onPrevious} />);
    const area = screen.getByTestId('area');

    swipe(area, 300, 300 - SWIPE_MIN_DISTANCE);
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onPrevious).not.toHaveBeenCalled();

    swipe(area, 100, 100 + SWIPE_MIN_DISTANCE);
    await waitFor(() => expect(onPrevious).toHaveBeenCalledTimes(1));
  });

  it('does nothing for a short gesture or a scroll', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={onPrevious} />);
    const area = screen.getByTestId('area');

    swipe(area, 300, 260);
    swipe(area, 300, 150, 400);
    await settle();

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('does nothing when it is disabled', async () => {
    const onNext = vi.fn();
    render(<Area enabled={false} onNext={onNext} onPrevious={vi.fn()} />);
    const area = screen.getByTestId('area');

    start(area, 300);
    move(area, 200);
    end(area, 100);
    await settle();

    expect(onNext).not.toHaveBeenCalled();
    expect(offsetOf()).toBe(0);
  });

  it('does not take a gesture that starts on something that scrolls on its own', async () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);

    swipe(screen.getByText('no se desliza'), 300, 100);
    await settle();

    expect(onNext).not.toHaveBeenCalled();
  });

  it('takes a gesture that starts on a child of the area', async () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);

    swipe(screen.getByText('sí se desliza'), 300, 100);

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
  });

  it('ignores a gesture with two fingers, which is a zoom', async () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);
    const area = screen.getByTestId('area');

    fireEvent.touchStart(area, { touches: [touch(300), touch(320)] });
    fireEvent.touchEnd(area, { changedTouches: [touch(100)] });
    await settle();

    expect(onNext).not.toHaveBeenCalled();
  });

  it('forgets a cancelled gesture', async () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);
    const area = screen.getByTestId('area');

    start(area, 300);
    move(area, 200);
    fireEvent.touchCancel(area);
    end(area, 100);
    await settle();

    expect(onNext).not.toHaveBeenCalled();
    expect(offsetOf()).toBe(0);
  });

  describe('following the finger', () => {
    it('moves with the finger, less than the finger does', () => {
      render(<Area onNext={vi.fn()} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');

      start(area, 300);
      move(area, 220);

      expect(offsetOf()).toBe(-40);
      expect(phaseOf()).toBe('dragging');

      move(area, 340);
      expect(offsetOf()).toBe(20);
    });

    it('never moves further than a limit', () => {
      render(<Area onNext={vi.fn()} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');

      start(area, 600);
      move(area, 0);

      expect(offsetOf()).toBe(-140);
    });

    it('stays still while the movement is tiny, before it is known which way it goes', () => {
      render(<Area onNext={vi.fn()} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');

      start(area, 300);
      move(area, 296);

      expect(offsetOf()).toBe(0);
      expect(phaseOf()).toBe('idle');
    });

    it('does not move for a vertical gesture, which is a scroll', () => {
      render(<Area onNext={vi.fn()} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');

      start(area, 300);
      move(area, 290, 160);
      move(area, 200, 170);

      expect(offsetOf()).toBe(0);
    });

    it('comes back when the gesture is not completed', async () => {
      const onNext = vi.fn();
      render(<Area onNext={onNext} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');

      start(area, 300);
      move(area, 230);
      expect(offsetOf()).toBe(-35);
      end(area, 230);

      expect(offsetOf()).toBe(0);
      expect(phaseOf()).toBe('idle');
      await settle();
      expect(onNext).not.toHaveBeenCalled();
    });

    it('leaves to the side of the gesture when it is completed, and changes the period after that', async () => {
      const onNext = vi.fn();
      render(<Area onNext={onNext} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');

      start(area, 300);
      move(area, 150);
      end(area, 150);

      expect(phaseOf()).toBe('leaving');
      expect(offsetOf()).toBe(-140);
      expect(onNext).not.toHaveBeenCalled();

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(offsetOf()).toBe(0);
      expect(phaseOf()).toBe('idle');
    });

    it('does not start another gesture while the content is leaving', async () => {
      const onNext = vi.fn();
      render(<Area onNext={onNext} onPrevious={vi.fn()} />);
      const area = screen.getByTestId('area');
      swipe(area, 300, 100);

      swipe(area, 300, 100);
      await settle();

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });
});
