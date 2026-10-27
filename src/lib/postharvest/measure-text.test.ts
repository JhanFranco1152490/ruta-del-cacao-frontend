import { describe, expect, it } from 'vitest';

import { moistureText, phText, temperatureText } from './measure-text';

describe('measure text', () => {
  it('writes the temperature with one decimal', () => {
    expect(temperatureText('45.00')).toBe('45,0 °C');
    expect(temperatureText('46.5')).toBe('46,5 °C');
  });

  it('writes the ph with two decimals', () => {
    expect(phText('4.90')).toBe('4,90');
    expect(phText('5')).toBe('5,00');
  });

  it('writes the moisture with one decimal', () => {
    expect(moistureText('5.80')).toBe('5,8 %');
    expect(moistureText('52')).toBe('52,0 %');
  });
});
