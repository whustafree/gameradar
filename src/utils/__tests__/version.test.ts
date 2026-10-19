import { describe, it, expect } from 'vitest';
import { parseVersion, isNewer, formatVersion } from '../version';

describe('parseVersion', () => {
  it('extrae la versión de una etiqueta de release', () => {
    expect(parseVersion('v2.8.0-build-20261019')).toEqual([2, 8, 0]);
    expect(parseVersion('2.7.0')).toEqual([2, 7, 0]);
    expect(parseVersion('v10.12.3')).toEqual([10, 12, 3]);
  });

  it('devuelve null si no hay versión', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion(null)).toBeNull();
    expect(parseVersion('latest')).toBeNull();
  });
});

describe('isNewer', () => {
  it('detecta versiones más nuevas', () => {
    expect(isNewer([2, 8, 0], [2, 7, 0])).toBe(true);
    expect(isNewer([3, 0, 0], [2, 99, 99])).toBe(true);
    expect(isNewer([2, 7, 1], [2, 7, 0])).toBe(true);
  });

  it('no marca como nueva la misma versión ni una anterior', () => {
    expect(isNewer([2, 7, 0], [2, 7, 0])).toBe(false);
    expect(isNewer([2, 6, 9], [2, 7, 0])).toBe(false);
    expect(isNewer([1, 99, 99], [2, 0, 0])).toBe(false);
  });

  it('es seguro con valores nulos', () => {
    expect(isNewer(null, [2, 7, 0])).toBe(false);
    expect(isNewer([2, 8, 0], null)).toBe(false);
  });
});

describe('formatVersion', () => {
  it('formatea para mostrar', () => {
    expect(formatVersion([2, 8, 0])).toBe('2.8.0');
    expect(formatVersion(null)).toBe('');
  });
});
