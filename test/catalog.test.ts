// test/catalog.test.ts
import { describe, it, expect } from 'vitest';
import * as c from '../src/catalog.js';

describe('catalog', () => {
  it('lists the seven supported techs', () => {
    expect([...c.SUPPORTED_TECHS]).toEqual(
      ['javascript','typescript','python','go','c','rust','java']);
  });
  it('loads the global modules with names', () => {
    const mods = c.globalModules();
    expect(mods.length).toBe(17);
    expect(mods.map(m => m.name)).toContain('craftsmanship');
    expect(mods.map(m => m.name)).toContain('security');
    expect(mods.find(m => m.name === 'security')!.content).toContain('# Security');
  });
  it('loads a stack module and rejects unknown tech', () => {
    expect(c.stackModule('typescript')).toContain('# TypeScript Guidelines');
    expect(() => c.stackModule('cobol')).toThrow('Unknown technology: cobol');
  });
  it('loads preambles', () => {
    expect(c.globalPreamble()).toContain('Global Dev Harness');
    expect(c.projectPreamble()).toContain('Project Harness');
  });
});
