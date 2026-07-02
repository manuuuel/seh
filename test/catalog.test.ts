// test/catalog.test.ts
import { describe, it, expect } from 'vitest';
import * as c from '../src/catalog.js';
import { stackCue, moduleCue, TECH_LABELS } from '../src/catalog.js';

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

describe('cues', () => {
  it('labels and cues stacks', () => {
    expect(TECH_LABELS.typescript).toBe('TypeScript');
    expect(stackCue('typescript')).toBe('Read before writing or reviewing TypeScript code.');
    expect(stackCue('go')).toBe('Read before writing or reviewing Go code.');
  });
  it('cues known project modules', () => {
    expect(moduleCue('.seh/project.md')).toMatch(/Read first/);
    expect(moduleCue('.seh/domain/architecture.md')).toMatch(/structure/);
    expect(moduleCue('.seh/domain/glossary.md')).toMatch(/term/);
    expect(moduleCue('.seh/domain/unknown.md')).toBe('');
  });
});
