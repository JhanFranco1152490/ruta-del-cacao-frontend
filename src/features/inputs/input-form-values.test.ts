import { describe, expect, it } from 'vitest';

import { buildAgriculturalInput } from '@/test/factories';

import { formValuesOf } from './input-form-values';

describe('formValuesOf', () => {
  it('starts empty to register a new input', () => {
    expect(formValuesOf()).toEqual({
      name: '',
      input_type: '',
      unit: '',
      package_type: '',
      package_size: '',
    });
  });

  it('shows the current values, with a decimal comma and no trailing zeros', () => {
    expect(
      formValuesOf(
        buildAgriculturalInput({
          package_type: 'gallon',
          package_size: '3.785',
          unit: 'l',
        }),
      ),
    ).toEqual({
      name: 'Urea 46 %',
      input_type: 'fertilizer',
      unit: 'l',
      package_type: 'gallon',
      package_size: '3,785',
    });
    expect(
      formValuesOf(buildAgriculturalInput({ package_size: '50.000' }))
        .package_size,
    ).toBe('50');
  });

  it('leaves the package empty when the input has none', () => {
    const values = formValuesOf(
      buildAgriculturalInput({ package_type: null, package_size: null }),
    );
    expect(values.package_type).toBe('');
    expect(values.package_size).toBe('');
  });
});
