import { describe, expect, it } from 'vitest';

import { NEW_PLOT_LABEL, farmLabel, plotLabel } from './place-label';

describe('farmLabel', () => {
  it('puts the code before the name', () => {
    expect(farmLabel({ code: 'F02', name: 'La Esperanza' })).toBe(
      'F02 · La Esperanza',
    );
  });

  it('shows only the name while the farm waits in the device', () => {
    expect(farmLabel({ name: 'La Esperanza' })).toBe('La Esperanza');
  });

  it('keeps a code of three digits as it comes', () => {
    expect(farmLabel({ code: 'F100', name: 'El Diviso' })).toBe(
      'F100 · El Diviso',
    );
  });
});

describe('plotLabel', () => {
  it('puts the code before the name', () => {
    expect(plotLabel({ code: 'P05', name: 'Lote del río' })).toBe(
      'P05 · Lote del río',
    );
  });

  it('shows only the code when the plot has no name', () => {
    expect(plotLabel({ code: 'P05', name: null })).toBe('P05');
    expect(plotLabel({ code: 'P05', name: '  ' })).toBe('P05');
    expect(plotLabel({ code: 'P05' })).toBe('P05');
  });

  it('shows only the name while the plot waits for its code', () => {
    expect(plotLabel({ name: 'La loma' })).toBe('La loma');
  });

  it('calls it a new plot when it has neither code nor name yet', () => {
    expect(plotLabel({ name: null })).toBe(NEW_PLOT_LABEL);
    expect(plotLabel({})).toBe('Parcela nueva');
  });
});
