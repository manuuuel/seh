// test/index-emitter.test.ts
import { describe, it, expect } from 'vitest';
import { buildIndex, buildDocument } from '../src/index-emitter.js';
import { BANNER } from '../src/banner.js';

describe('buildIndex', () => {
  const out = buildIndex('# Title\nPreamble text.', [
    { title: 'Security', relPath: '.seh/global/security.md' },
    { title: 'Testing', relPath: '.seh/global/testing.md' },
  ]);
  it('starts with the banner', () => expect(out.startsWith(BANNER)).toBe(true));
  it('includes the preamble', () => expect(out).toContain('Preamble text.'));
  it('renders a Contents section with links in order', () => {
    expect(out).toContain('## Contents');
    const iSec = out.indexOf('- [Security](.seh/global/security.md)');
    const iTest = out.indexOf('- [Testing](.seh/global/testing.md)');
    expect(iSec).toBeGreaterThan(-1);
    expect(iTest).toBeGreaterThan(iSec);
  });
  it('is deterministic', () => {
    expect(buildIndex('# T\nP', [{ title: 'A', relPath: 'a.md' }]))
      .toBe(buildIndex('# T\nP', [{ title: 'A', relPath: 'a.md' }]));
  });
});

describe('buildIndex cues', () => {
  it('appends a cue after the link when present', () => {
    const out = buildIndex('# P\n\nintro', [
      { title: 'TypeScript Guidelines', relPath: '.seh/stack/typescript.md', cue: 'Read before writing TypeScript code.' },
      { title: 'Glossary', relPath: '.seh/domain/glossary.md' },
    ]);
    expect(out).toContain('- [TypeScript Guidelines](.seh/stack/typescript.md) — Read before writing TypeScript code.');
    expect(out).toContain('- [Glossary](.seh/domain/glossary.md)\n');
    expect(out).not.toContain('Glossary](.seh/domain/glossary.md) —');
  });
});

describe('buildDocument', () => {
  const out = buildDocument('# G\nPreamble.', ['# A\nalpha body', '# B\nbeta body']);
  it('starts with the banner', () => expect(out.startsWith(BANNER)).toBe(true));
  it('inlines section bodies (not an index)', () => {
    expect(out).toContain('alpha body');
    expect(out).toContain('beta body');
    expect(out).not.toContain('## Contents');
  });
  it('keeps section order', () => {
    expect(out.indexOf('# A')).toBeLessThan(out.indexOf('# B'));
  });
});
