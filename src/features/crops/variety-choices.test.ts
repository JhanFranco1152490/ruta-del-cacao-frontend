import { describe, expect, it } from 'vitest';

import { type VarietyOption, varietyChoices } from './variety-choices';

const catalog: VarietyOption[] = [
  { id: 'ics-95', name: 'ICS-95', isActive: true, commonNames: [] },
  { id: 'ccn-51', name: 'CCN-51', isActive: true, commonNames: [] },
  { id: 'scc-61', name: 'SCC-61', isActive: false, commonNames: [] },
];

describe('varietyChoices', () => {
  it('offers the active varieties in alphabetical order', () => {
    expect(
      varietyChoices(catalog, new Set()).map((choice) => choice.label),
    ).toEqual(['CCN-51', 'ICS-95']);
  });

  it('keeps a deactivated variety the characterization already had, marked as such', () => {
    expect(
      varietyChoices(catalog, new Set(['scc-61'])).map(
        (choice) => choice.label,
      ),
    ).toEqual(['CCN-51', 'ICS-95', 'SCC-61 (desactivada)']);
  });

  it('ignores a line that has no variety yet', () => {
    expect(varietyChoices(catalog, new Set(['']))).toHaveLength(2);
  });

  it('keeps a deactivated variety the characterization already had, as still available', () => {
    const kept = varietyChoices(catalog, new Set(['scc-61'])).find(
      (choice) => choice.id === 'scc-61',
    );

    expect(kept).toMatchObject({ isActive: false, isAvailable: true });
  });

  it('marks a deactivated variety that only the device has as no longer available', () => {
    const choices = varietyChoices(catalog, new Set(), new Set(['scc-61']));

    expect(choices.find((choice) => choice.id === 'scc-61')).toMatchObject({
      label: 'SCC-61 (ya no disponible)',
      isAvailable: false,
    });
  });

  it('keeps a variety the saved catalog does not know, last and not available', () => {
    const choices = varietyChoices(catalog, new Set(), new Set(['fear-5']));

    expect(choices.at(-1)).toMatchObject({
      id: 'fear-5',
      isActive: false,
      isAvailable: false,
      label: 'Variedad no disponible en este dispositivo',
    });
  });

  it('treats an unknown variety the server characterization had as available', () => {
    const choices = varietyChoices(catalog, new Set(['fear-5']));

    expect(choices.find((choice) => choice.id === 'fear-5')).toMatchObject({
      isAvailable: true,
    });
  });

  it('shows the code with the first common name, the one producers recognize', () => {
    const choices = varietyChoices(
      [
        {
          id: 'fsa-12',
          name: 'FSA-12',
          isActive: true,
          commonNames: ['Saravena', 'Fedecacao Saravena'],
        },
        {
          id: 'scc-61',
          name: 'SCC-61',
          isActive: false,
          commonNames: ['San Vicente'],
        },
      ],
      new Set(['scc-61']),
    );

    expect(choices.map((choice) => choice.label)).toEqual([
      'FSA-12 · Saravena',
      'SCC-61 · San Vicente (desactivada)',
    ]);
  });
});
