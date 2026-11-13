import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';

import {
  availableIndicatorViews,
  resolveIndicatorView,
} from './indicator-view';

const PRODUCER = { permissions: [PERMISSIONS.INDICATORS_VIEW_PRODUCER] };
const ASSOCIATION = { permissions: [PERMISSIONS.INDICATORS_VIEW_ASSOCIATION] };
const BOTH = {
  permissions: [
    PERMISSIONS.INDICATORS_VIEW_PRODUCER,
    PERMISSIONS.INDICATORS_VIEW_ASSOCIATION,
  ],
};

describe('availableIndicatorViews', () => {
  it('da a cada cuenta el panel de su permiso', () => {
    expect(availableIndicatorViews(PRODUCER)).toEqual(['producer']);
    expect(availableIndicatorViews(ASSOCIATION)).toEqual(['association']);
    expect(availableIndicatorViews(BOTH)).toEqual(['producer', 'association']);
  });

  it('no da ninguno sin sesión o sin el permiso', () => {
    expect(availableIndicatorViews(undefined)).toEqual([]);
    expect(
      availableIndicatorViews({ permissions: ['sales.view_sale'] }),
    ).toEqual([]);
  });
});

describe('resolveIndicatorView', () => {
  it('respeta el panel pedido si la cuenta lo tiene', () => {
    expect(resolveIndicatorView(['producer', 'association'], 'producer')).toBe(
      'producer',
    );
  });

  it('ignora un panel que la cuenta no tiene o una dirección mal escrita', () => {
    expect(resolveIndicatorView(['producer'], 'association')).toBe('producer');
    expect(resolveIndicatorView(['producer'], 'zzz')).toBe('producer');
  });

  it('abre el de la asociación cuando la cuenta tiene los dos y no pidió uno', () => {
    expect(resolveIndicatorView(['producer', 'association'], null)).toBe(
      'association',
    );
  });

  it('no abre ninguno sin permisos', () => {
    expect(resolveIndicatorView([], 'producer')).toBeNull();
  });
});
