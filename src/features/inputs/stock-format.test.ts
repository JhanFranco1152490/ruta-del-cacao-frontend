import { describe, expect, it } from 'vitest';

import {
  formatPackage,
  formatQuantity,
  formatStock,
  isNegativeStock,
  packagesToUnit,
} from './stock-format';

const tub = { package_type: 'tub', package_size: '100.000' };
const sack = { package_type: 'sack', package_size: '50.000' };

describe('formatQuantity', () => {
  it('writes the amount with up to three decimals and the unit symbol', () => {
    expect(formatQuantity('250.000', 'ml')).toBe('250 mL');
    expect(formatQuantity('3.250', 'l')).toBe('3,25 L');
    expect(formatQuantity('0.125', 'kg')).toBe('0,125 kg');
    expect(formatQuantity('40', 'g')).toBe('40 g');
  });

  it('keeps the sign of a negative stock', () => {
    expect(formatQuantity('-20.000', 'ml')).toBe('−20 mL');
  });

  it('says unidad or unidades', () => {
    expect(formatQuantity('1.000', 'unit')).toBe('1 unidad');
    expect(formatQuantity('12', 'unit')).toBe('12 unidades');
  });
});

describe('formatPackage', () => {
  it('names the package with its content', () => {
    expect(formatPackage('tub', '100.000', 'ml')).toBe('Pote de 100 mL');
    expect(formatPackage('gallon', '3.785', 'l')).toBe('Galón de 3,785 L');
    expect(formatPackage('box', '12', 'unit')).toBe('Caja de 12 unidades');
  });

  it('shows a package this version does not know as it comes', () => {
    expect(formatPackage('crate', '10', 'kg')).toBe('crate de 10 kg');
  });
});

describe('formatStock', () => {
  it('says there are no movements yet, which is not the same as zero', () => {
    expect(formatStock(null, 'ml', tub)).toBe('Sin movimientos');
  });

  it('adds what the stock means in packages', () => {
    expect(formatStock('250.000', 'ml', tub)).toBe('250 mL · 2,5 potes');
    expect(formatStock('170.000', 'kg', sack)).toBe('170 kg · 3,4 bultos');
    expect(formatStock('100.000', 'ml', tub)).toBe('100 mL · 1 pote');
  });

  it('rounds the packages to one decimal', () => {
    expect(formatStock('333.000', 'ml', tub)).toBe('333 mL · 3,3 potes');
  });

  it('does not round a little stock down to zero packages', () => {
    expect(formatStock('4.000', 'ml', tub)).toBe('4 mL · menos de 0,1 potes');
  });

  it('shows only the amount without a package, at zero or below zero', () => {
    expect(formatStock('250.000', 'ml', null)).toBe('250 mL');
    expect(formatStock('0.000', 'ml', tub)).toBe('0 mL');
    expect(formatStock('-20.000', 'ml', tub)).toBe('−20 mL');
  });
});

describe('isNegativeStock', () => {
  it('is true only below zero', () => {
    expect(isNegativeStock('-0.001')).toBe(true);
    expect(isNegativeStock('0.000')).toBe(false);
    expect(isNegativeStock(null)).toBe(false);
  });
});

describe('packagesToUnit', () => {
  it('turns packages into the unit without floating point noise', () => {
    expect(packagesToUnit('3', '100')).toBe('300');
    expect(packagesToUnit('2.5', '50')).toBe('125');
    expect(packagesToUnit('3', '0.1')).toBe('0.3');
    expect(packagesToUnit('1.5', '3.785')).toBe('5.678');
  });
});
