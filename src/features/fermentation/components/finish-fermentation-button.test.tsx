import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildFermentation, buildFermentationTurn } from '@/test/factories';
import { renderWithProviders } from '@/test/render';

import { FinishFermentationButton } from './finish-fermentation-button';

const withTurn = buildFermentation({ turns: [buildFermentationTurn()] });
const withoutTurns = buildFermentation({ turns: [] });

const dialog = () =>
  screen.queryByRole('dialog', { name: /Finalizar fermentación/ });

describe('FinishFermentationButton', () => {
  it('opens its form with the button', async () => {
    renderWithProviders(
      <FinishFermentationButton fermentation={withTurn} online queued={[]} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar fermentación' }),
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('waits for the connection before opening the form a link asked for', () => {
    const onAutoOpened = vi.fn();
    const { rerender } = renderWithProviders(
      <FinishFermentationButton
        autoOpen
        fermentation={withTurn}
        onAutoOpened={onAutoOpened}
        online={false}
        queued={[]}
      />,
    );

    expect(dialog()).not.toBeInTheDocument();
    expect(onAutoOpened).not.toHaveBeenCalled();

    rerender(
      <FinishFermentationButton
        autoOpen
        fermentation={withTurn}
        onAutoOpened={onAutoOpened}
        online
        queued={[]}
      />,
    );

    expect(dialog()).toBeInTheDocument();
  });

  it('only shows why it cannot finish a lot without turns, and clears the link', () => {
    const onAutoOpened = vi.fn();
    renderWithProviders(
      <FinishFermentationButton
        autoOpen
        fermentation={withoutTurns}
        onAutoOpened={onAutoOpened}
        online
        queued={[]}
      />,
    );

    expect(dialog()).not.toBeInTheDocument();
    expect(
      screen.getByText('Registre al menos un volteo para finalizar'),
    ).toBeInTheDocument();
    expect(onAutoOpened).toHaveBeenCalled();
  });
});
