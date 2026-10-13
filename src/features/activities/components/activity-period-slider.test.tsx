import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SWIPE_LEAVE_MS } from '@/hooks/use-swipe-navigation';

import { ActivityPeriodSlider } from './activity-period-slider';

type Props = Partial<Parameters<typeof ActivityPeriodSlider>[0]>;

function Slider(props: Props) {
  return (
    <ActivityPeriodSlider
      enabled
      onNext={vi.fn()}
      onPrevious={vi.fn()}
      periodKey="2026-10"
      ready
      scope="mes"
      {...props}
    >
      <p>contenido</p>
    </ActivityPeriodSlider>
  );
}

const touch = (x: number, y = 100) => ({ clientX: x, clientY: y });
const content = () => screen.getByText('contenido').parentElement!;
const start = (x: number) =>
  fireEvent.touchStart(screen.getByText('contenido'), { touches: [touch(x)] });
const move = (x: number, y = 100) =>
  fireEvent.touchMove(screen.getByText('contenido'), {
    touches: [touch(x, y)],
  });
const end = (x: number) =>
  fireEvent.touchEnd(screen.getByText('contenido'), {
    changedTouches: [touch(x)],
  });

let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  animate = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animate,
  });
});

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  vi.unstubAllGlobals();
});

describe('ActivityPeriodSlider', () => {
  it('shows what it holds', () => {
    render(<Slider />);

    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  describe('following the finger', () => {
    it('moves with the finger and lets the page scroll up and down', () => {
      render(<Slider />);

      start(300);
      move(220);

      expect(content().style.transform).toBe('translateX(-40px)');
      expect(content().style.touchAction).toBe('pan-y');
    });

    it('comes back when the gesture is not completed, without changing the period', async () => {
      const onNext = vi.fn();
      render(<Slider onNext={onNext} />);

      start(300);
      move(230);
      end(230);

      expect(content().style.transform).toBe('');
      await new Promise((resolve) => setTimeout(resolve, SWIPE_LEAVE_MS + 60));
      expect(onNext).not.toHaveBeenCalled();
    });

    it('goes out to the side and changes the period when the gesture is completed', async () => {
      const onNext = vi.fn();
      render(<Slider onNext={onNext} />);

      start(300);
      move(150);
      end(150);

      expect(content().style.opacity).toBe('0');
      expect(content().style.transform).toBe('translateX(-140px)');
      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(content().style.transform).toBe('');
      expect(content().style.opacity).toBe('');
    });

    it('does not move and does not touch-action when it is disabled', () => {
      render(<Slider enabled={false} />);

      start(300);
      move(200);

      expect(content().style.transform).toBe('');
      expect(content().style.touchAction).toBe('');
    });
  });

  describe('the entrance of the new period', () => {
    it('comes in from the right when the period is later, once it is ready', () => {
      const { rerender } = render(<Slider />);
      expect(animate).not.toHaveBeenCalled();

      rerender(<Slider periodKey="2026-11" />);

      expect(animate).toHaveBeenCalledTimes(1);
      const [frames] = animate.mock.calls[0];
      expect(frames[0]).toMatchObject({
        transform: 'translateX(32px)',
        opacity: 0,
      });
      expect(frames[1]).toMatchObject({
        transform: 'translateX(0)',
        opacity: 1,
      });
    });

    it('comes in from the left when the period is earlier', () => {
      const { rerender } = render(<Slider periodKey="2026-10" />);

      rerender(<Slider periodKey="2026-09" />);

      expect(animate.mock.calls[0][0][0]).toMatchObject({
        transform: 'translateX(-32px)',
      });
    });

    it('waits for the new period to have something to show', () => {
      const { rerender } = render(<Slider />);

      rerender(<Slider periodKey="2026-11" ready={false} />);
      expect(animate).not.toHaveBeenCalled();

      rerender(<Slider periodKey="2026-11" ready />);
      expect(animate).toHaveBeenCalledTimes(1);
      expect(animate.mock.calls[0][0][0]).toMatchObject({
        transform: 'translateX(32px)',
      });
    });

    it('does not animate once per period change but only once', () => {
      const { rerender } = render(<Slider />);
      rerender(<Slider periodKey="2026-11" />);
      rerender(<Slider periodKey="2026-11" />);

      expect(animate).toHaveBeenCalledTimes(1);
    });

    it('does not animate when what is looked at changes, only when the period does', () => {
      const { rerender } = render(<Slider />);

      rerender(<Slider periodKey="2026-10-19" scope="semana" />);

      expect(animate).not.toHaveBeenCalled();
    });

    it('does not animate for people who asked for less motion', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: true })),
      );
      const { rerender } = render(<Slider />);

      rerender(<Slider periodKey="2026-11" />);

      expect(animate).not.toHaveBeenCalled();
    });

    it('does nothing where the browser cannot animate', () => {
      Reflect.deleteProperty(HTMLElement.prototype, 'animate');
      const { rerender } = render(<Slider />);

      expect(() => rerender(<Slider periodKey="2026-11" />)).not.toThrow();
    });
  });
});
