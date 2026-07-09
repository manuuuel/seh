// test/index-emitter.test.ts
import { describe, it, expect } from 'vitest';
import { buildIndex, buildDocument, buildSkillsSection, buildMemorySection } from '../src/index-emitter.js';
import { BANNER } from '../src/banner.js';
import type { SkillEntry, MemoryEntry } from '../src/types.js';

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

describe('buildSkillsSection', () => {
  it('returns empty string when no skills have invoke', () => {
    const skills: Record<string, SkillEntry> = {
      'xlsx': { type: 'vendor' },
    };
    expect(buildSkillsSection(skills)).toBe('');
  });

  it('returns empty string when skills record is empty', () => {
    expect(buildSkillsSection({})).toBe('');
  });

  it('renders always section', () => {
    const skills: Record<string, SkillEntry> = {
      'caveman': { type: 'vendor', invoke: { mode: 'always', label: 'every response' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('## Skills');
    expect(out).toContain('Always invoke:');
    expect(out).toContain('`caveman` — every response');
  });

  it('renders always entry without label', () => {
    const skills: Record<string, SkillEntry> = {
      'caveman': { type: 'vendor', invoke: { mode: 'always' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('`caveman`');
    expect(out).not.toContain('undefined');
  });

  it('renders when section', () => {
    const skills: Record<string, SkillEntry> = {
      'systematic-debugging': { type: 'vendor', invoke: { mode: 'when', condition: 'bug / test failure' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('Invoke when:');
    expect(out).toContain('`systematic-debugging` — bug / test failure');
  });

  it('renders optional section', () => {
    const skills: Record<string, SkillEntry> = {
      'xlsx': { type: 'vendor', invoke: { mode: 'optional' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('Optional:');
    expect(out).toContain('`xlsx`');
  });

  it('renders all three sections in order: always, when, optional', () => {
    const skills: Record<string, SkillEntry> = {
      'caveman': { type: 'vendor', invoke: { mode: 'always', label: 'every response' } },
      'xlsx': { type: 'vendor', invoke: { mode: 'optional' } },
      'systematic-debugging': { type: 'vendor', invoke: { mode: 'when', condition: 'bug / test failure' } },
    };
    const out = buildSkillsSection(skills);
    const alwaysIdx = out.indexOf('Always invoke:');
    const whenIdx = out.indexOf('Invoke when:');
    const optIdx = out.indexOf('Optional:');
    expect(alwaysIdx).toBeLessThan(whenIdx);
    expect(whenIdx).toBeLessThan(optIdx);
  });

  it('skips skills with no invoke', () => {
    const skills: Record<string, SkillEntry> = {
      'xlsx': { type: 'vendor' },
      'caveman': { type: 'vendor', invoke: { mode: 'always' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('`caveman`');
    expect(out).not.toContain('`xlsx`');
  });
});

describe('buildMemorySection', () => {
  it('returns protocol block only when entries array is empty', () => {
    const out = buildMemorySection([]);
    expect(out).toContain('## Memory');
    expect(out).toContain('seh memory add');
    expect(out).not.toContain('### Decisions');
  });

  it('renders protocol block always', () => {
    const entries: MemoryEntry[] = [
      { name: 'auth', type: 'decision', title: 'Auth strategy', relPath: '.seh/memory/auth.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('**decision**');
    expect(out).toContain('**constraint**');
    expect(out).toContain('**learning**');
    expect(out).toContain('**problem**');
    expect(out).toContain('seh memory add <name>');
  });

  it('renders Decisions subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'auth', type: 'decision', title: 'Auth strategy', relPath: '.seh/memory/auth.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Decisions');
    expect(out).toContain('[Auth strategy](.seh/memory/auth.md)');
  });

  it('renders Constraints subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'url', type: 'constraint', title: 'URL structure', relPath: '.seh/memory/url.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Constraints');
    expect(out).toContain('[URL structure](.seh/memory/url.md)');
  });

  it('renders Learnings subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'jwt', type: 'learning', title: 'JWT expiry', relPath: '.seh/memory/jwt.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Learnings');
    expect(out).toContain('[JWT expiry](.seh/memory/jwt.md)');
  });

  it('renders Open problems subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'rate', type: 'problem', title: 'Rate limiting', relPath: '.seh/memory/rate.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Open problems');
    expect(out).toContain('[Rate limiting](.seh/memory/rate.md)');
  });

  it('renders all four subsections in order when all types present', () => {
    const entries: MemoryEntry[] = [
      { name: 'a', type: 'decision', title: 'D', relPath: '.seh/memory/a.md' },
      { name: 'b', type: 'constraint', title: 'C', relPath: '.seh/memory/b.md' },
      { name: 'c', type: 'learning', title: 'L', relPath: '.seh/memory/c.md' },
      { name: 'd', type: 'problem', title: 'P', relPath: '.seh/memory/d.md' },
    ];
    const out = buildMemorySection(entries);
    const dIdx = out.indexOf('### Decisions');
    const cIdx = out.indexOf('### Constraints');
    const lIdx = out.indexOf('### Learnings');
    const pIdx = out.indexOf('### Open problems');
    expect(dIdx).toBeLessThan(cIdx);
    expect(cIdx).toBeLessThan(lIdx);
    expect(lIdx).toBeLessThan(pIdx);
  });

  it('omits subsection when type has no entries', () => {
    const entries: MemoryEntry[] = [
      { name: 'a', type: 'decision', title: 'D', relPath: '.seh/memory/a.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).not.toContain('### Constraints');
    expect(out).not.toContain('### Learnings');
    expect(out).not.toContain('### Open problems');
  });

  it('sorts entries alphabetically by title within each subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'z', type: 'decision', title: 'Zebra', relPath: '.seh/memory/z.md' },
      { name: 'a', type: 'decision', title: 'Apple', relPath: '.seh/memory/a.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out.indexOf('Apple')).toBeLessThan(out.indexOf('Zebra'));
  });
});
