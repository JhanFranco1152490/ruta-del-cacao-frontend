import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SWIPE_MIN_DISTANCE } from '@/lib/swipe';

import { useSwipeNavigation } from './use-swipe-navigation';

function Area({
  onPrevious,
  onNext,
  enabled = true,
}: {
  onPrevious: () => void;
  onNext: () => void;
  enabled?: boolean;
}) {
  const swipe = useSwipeNavigation({ onPrevious, onNext, enabled });
  return (
    <div data-testid="area" {...swipe}>
      <span data-no-swipe="">no se desliza</span>
      <span>sí se desliza</span>
    </div>
  );
}

const touch = (x: number, y = 100) => ({ clientX: x, clientY: y });
function swipe(target: Element, fromX: number, toX: number, toY = 100) {
  fireEvent.touchStart(target, { touches: [touch(fromX)] });
  fireEvent.touchEnd(target, { changedTouches: [touch(toX, toY)] });
}

describe('useSwipeNavigation', () => {
  it('goes to the next period when the finger goes left, and to the previous when it goes right', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={onPrevious} />);
    const area = screen.getByTestId('area');

    swipe(area, 300, 300 - SWIPE_MIN_DISTANCE);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();

    swipe(area, 100, 100 + SWIPE_MIN_DISTANCE);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a short gesture or a scroll', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={onPrevious} />);
    const area = screen.getByTestId('area');

    swipe(area, 300, 260);
    swipe(area, 300, 150, 400);

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('does nothing when it is disabled', () => {
    const onNext = vi.fn();
    render(<Area enabled={false} onNext={onNext} onPrevious={vi.fn()} />);

    swipe(screen.getByTestId('area'), 300, 100);

    expect(onNext).not.toHaveBeenCalled();
  });

  it('does not take a gesture that starts on something that scrolls on its own', () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);

    swipe(screen.getByText('no se desliza'), 300, 100);

    expect(onNext).not.toHaveBeenCalled();
  });

  it('takes a gesture that starts on a child of the area', () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);

    swipe(screen.getByText('sí se desliza'), 300, 100);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('ignores a gesture with two fingers, which is a zoom', () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);
    const area = screen.getByTestId('area');

    fireEvent.touchStart(area, { touches: [touch(300), touch(320)] });
    fireEvent.touchEnd(area, { changedTouches: [touch(100)] });

    expect(onNext).not.toHaveBeenCalled();
  });

  it('forgets a cancelled gesture', () => {
    const onNext = vi.fn();
    render(<Area onNext={onNext} onPrevious={vi.fn()} />);
    const area = screen.getByTestId('area');

    fireEvent.touchStart(area, { touches: [touch(300)] });
    fireEvent.touchCancel(area);
    fireEvent.touchEnd(area, { changedTouches: [touch(100)] });

    expect(onNext).not.toHaveBeenCalled();
  });
});
