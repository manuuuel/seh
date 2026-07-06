// test/initProject.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitProject } from '../src/commands/initProject.js';
import { PackageResolver } from '../src/package-resolver.js';
import { packageTemplatesStackDir } from '../src/paths.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehip-')); }

describe('runInitProject (v2)', () => {
  let root: string;
  beforeEach(() => { root = tmp(); });

  it('scaffolds .seh and syncs selected technologies', () => {
    const res = runInitProject({ root, technologies: ['typescript'] });
    expect(fs.existsSync(path.join(root, '.seh', 'project.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'domain', 'glossary.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'stack', 'typescript.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'AGENTS.md'))).toBe(true);
    expect(res.synced).toContain('.seh/AGENTS.md');
  });

  it('rejects an empty selection', () => {
    expect(() => runInitProject({ root, technologies: [] }))
      .toThrow('Select at least one technology');
  });

  it('rejects an unknown technology', () => {
    expect(() => runInitProject({ root, technologies: ['cobol'] }))
      .toThrow('Unknown technology: cobol');
  });

  it('skips existing project files without force', () => {
    runInitProject({ root, technologies: ['go'] });
    const res = runInitProject({ root, technologies: ['go'] });
    expect(res.skipped).toContain('.seh/project.md');
  });
  it('creates project symlinks when projectTools provided', () => {
    const r = fs.mkdtempSync(path.join(os.tmpdir(), 'sehip-'));
    runInitProject({ root: r, technologies: ['typescript'], projectAgents: ['codex'] });
    expect(fs.lstatSync(path.join(r, 'AGENTS.md')).isSymbolicLink()).toBe(true);
  });
});

describe('runInitProject with resolver', () => {
  it('uses package project template files when templateName provided', () => {
    const root = tmp();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    const tplDir = path.join(pkg, 'templates', 'project', 'nextjs');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(path.join(tplDir, 'project.md'), '# NextJS Project\n');
    const resolver = new PackageResolver(pkg);
    runInitProject({ root, technologies: ['typescript'], resolver, templateName: 'nextjs' });
    expect(fs.readFileSync(path.join(root, 'project.md'), 'utf8')).toBe('# NextJS Project\n');
  });

  it('falls back to bundled template files when templateName absent', () => {
    const root = tmp();
    const resolver = new PackageResolver(fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-')));
    runInitProject({ root, technologies: ['typescript'], resolver });
    expect(fs.existsSync(path.join(root, '.seh', 'project.md'))).toBe(true);
  });

  it('passes resolver to runSync so stack override applies', () => {
    const root = tmp();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageTemplatesStackDir(pkg), { recursive: true });
    fs.writeFileSync(path.join(packageTemplatesStackDir(pkg), 'python.md'), '# Custom Python\n');
    const resolver = new PackageResolver(pkg);
    runInitProject({ root, technologies: ['python'], resolver });
    expect(fs.readFileSync(path.join(root, '.seh', 'stack', 'python.md'), 'utf8')).toBe('# Custom Python\n');
  });
});
