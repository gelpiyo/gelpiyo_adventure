// Feature: gelpiyo-deep-sea-adventure
// Setup verification test: confirms vitest + fast-check are working correctly

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Project setup', () => {
  it('vitest is configured correctly', () => {
    expect(true).toBe(true);
  });

  it('fast-check is available and working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number';
      })
    );
  });
});
