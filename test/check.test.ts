// test/check.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSync } from '../src/commands/sync.js';
import { runCheck } from '../src/commands/check.js';
import { PackageResolver } from '../src/package-resolver.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehchk-')); }

/** A harness package whose manifest routes one skill. */
function packageWithSkill(): PackageResolver {
  const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
  fs.writeFileSync(
    path.join(pkg, 'harness.json'),
    JSON.stringify({
      name: 'p',
      version: '1.0.0',
      skills: { tdd: { type: 'vendor', invoke: { mode: 'when', condition: 'building a feature test-first' } } },
    }),
  );
  return new PackageResolver(pkg);
}

describe('runCheck (v2)', () => {
  let root: string;
  beforeEach(() => {
    root = tmp();
    fs.mkdirSync(path.join(root, '.seh'), { recursive: true });
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Project\nMISSION');
  });

  it('ok right after sync', () => {
    runSync({ root, technologies: ['typescript'] });
    expect(runCheck({ root }).ok).toBe(true);
  });

  it('stays ok after sync when the active package contributes skills', () => {
    const resolver = packageWithSkill();
    runSync({ root, technologies: ['typescript'], resolver });
    const res = runCheck({ root, resolver });
    expect(res.drift).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('stays ok after sync when the project has memory entries', () => {
    fs.mkdirSync(path.join(root, '.seh', 'memory'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.seh', 'memory', '2026-01-01-decision-pick-vitest.md'),
      '# Pick vitest\nBecause it is fast.\n',
    );
    runSync({ root, technologies: ['typescript'] });
    const res = runCheck({ root });
    expect(res.drift).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('still detects real index drift when a package is active', () => {
    const resolver = packageWithSkill();
    runSync({ root, technologies: ['typescript'], resolver });
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Renamed\nX');
    const res = runCheck({ root, resolver });
    expect(res.ok).toBe(false);
    expect(res.drift).toContain('.seh/AGENTS.md');
  });

  it('reports missing lock when never synced', () => {
    const res = runCheck({ root });
    expect(res.ok).toBe(false);
    expect(res.missing).toContain('seh.lock');
  });

  it('detects index drift after editing a source', () => {
    runSync({ root, technologies: ['typescript'] });
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Project\nCHANGED TITLE HERE');
    // title unchanged ('Project') so index identical; change the heading to force drift:
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Renamed\nX');
    const res = runCheck({ root });
    expect(res.ok).toBe(false);
    expect(res.drift).toContain('.seh/AGENTS.md');
  });

  it('detects stack module drift', () => {
    runSync({ root, technologies: ['go'] });
    fs.writeFileSync(path.join(root, '.seh', 'stack', 'go.md'), '# tampered');
    const res = runCheck({ root });
    expect(res.ok).toBe(false);
    expect(res.drift).toContain('.seh/stack/go.md');
  });

  it('flags a project symlink that points elsewhere', () => {
    // build a valid project first
    const r = fs.mkdtempSync(path.join(os.tmpdir(), 'sehchk-'));
    fs.mkdirSync(path.join(r, '.seh', 'domain'), { recursive: true });
    fs.writeFileSync(path.join(r, '.seh', 'project.md'), '# Project\n');
    // codex links <root>/AGENTS.md — the symlink this test then replaces.
    runSync({ root: r, technologies: ['typescript'], projectAgents: ['codex'] });
    // Assert the premise: without a symlink here the rest of the test passes
    // vacuously, which it did while the option name was misspelled.
    expect(fs.lstatSync(path.join(r, 'AGENTS.md')).isSymbolicLink()).toBe(true);
    expect(runCheck({ root: r }).ok).toBe(true);
    // replace the symlink target with a bogus real file
    fs.rmSync(path.join(r, 'AGENTS.md'), { force: true });
    fs.writeFileSync(path.join(r, 'AGENTS.md'), 'not a symlink');
    const res = runCheck({ root: r });
    expect(res.ok).toBe(false);
    expect(res.drift.some((d) => d.startsWith('AGENTS.md'))).toBe(true);
  });
});
