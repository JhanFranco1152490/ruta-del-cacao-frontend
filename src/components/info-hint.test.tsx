import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InfoHint } from './info-hint';

const icon = (container: HTMLElement) =>
  container.querySelector('svg.lucide-info')!.parentElement!;

describe('InfoHint', () => {
  it('shows its text when it is tapped, as on a touch screen', async () => {
    const { container } = render(
      <InfoHint text="Manchas cafés en la mazorca" />,
    );

    await userEvent.click(icon(container));

    expect(
      await screen.findByText('Manchas cafés en la mazorca'),
    ).toBeVisible();
  });

  it('shows its text with the mouse over it', async () => {
    const { container } = render(
      <InfoHint text="Manchas cafés en la mazorca" />,
    );

    await userEvent.hover(icon(container));

    expect(
      await screen.findByText('Manchas cafés en la mazorca'),
    ).toBeVisible();
  });

  it('does not pass the tap to the option that holds it', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <div onClick={onClick}>
        <InfoHint text="Manchas cafés en la mazorca" />
      </div>,
    );

    await userEvent.click(icon(container));

    expect(onClick).not.toHaveBeenCalled();
  });
});
