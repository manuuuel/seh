// test/index-emitter.test.ts
import { describe, it, expect } from 'vitest';
import { buildIndex, buildDocument, buildSkillsSection } from '../src/index-emitter.js';
import { BANNER } from '../src/banner.js';
import type { SkillEntry } from '../src/types.js';

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
