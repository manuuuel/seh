// test/generator.test.ts
import { describe, it, expect } from 'vitest';
import { compose, BANNER, type Layer } from '../src/generator.js';

const layers: Layer[] = [
  { name: 'L2', source: '.harness/project.md', content: 'PROJECT' },
  { name: 'L0', source: 'core/PRINCIPLES.md', content: 'PRINCIPLES' },
  { name: 'L1', source: '~/.se-harness/preferences.md', content: 'PREFS' },
];

describe('generator', () => {
  it('starts with the banner', () => {
    expect(compose(layers).startsWith(BANNER)).toBe(true);
  });
  it('orders L0 then L1 then L2 regardless of input order', () => {
    const out = compose(layers);
    expect(out.indexOf('PRINCIPLES')).toBeLessThan(out.indexOf('PREFS'));
    expect(out.indexOf('PREFS')).toBeLessThan(out.indexOf('PROJECT'));
  });
  it('includes provenance comments', () => {
    expect(compose(layers)).toContain('<!-- source: L0 (core/PRINCIPLES.md) -->');
  });
  it('is deterministic', () => {
    expect(compose(layers)).toBe(compose(layers));
  });
});
