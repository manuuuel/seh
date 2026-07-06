import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSync } from '../src/commands/sync.js';
import { projectCanonicalIndex, projectIndexFile, projectGeminiFile, projectSehDir } from '../src/paths.js';
import { PackageResolver } from '../src/package-resolver.js';
import { packageTemplatesStackDir, packageProjectsDir } from '../src/paths.js';

function repoWithProject() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'sehsync-'));
  fs.mkdirSync(path.join(projectSehDir(r), 'domain'), { recursive: true });
  fs.writeFileSync(path.join(projectSehDir(r), 'project.md'), '# Project\n');
  fs.writeFileSync(path.join(projectSehDir(r), 'domain', 'glossary.md'), '# Glossary\n');
  return r;
}

describe('runSync', () => {
  it('writes the canonical index with cues', () => {
    const r = repoWithProject();
    runSync({ root: r, technologies: ['typescript'], projectAgents: [] });
    const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
    expect(idx).toContain('- [Project](.seh/project.md) — Read first');
    expect(idx).toContain('- [TypeScript Guidelines](.seh/stack/typescript.md) — Read before writing or reviewing TypeScript code.');
    expect(fs.existsSync(projectIndexFile(r))).toBe(false); // no tools => no symlinks
  });
  it('creates project symlinks for configured tools and gitignores them', () => {
    const r = repoWithProject();
    runSync({ root: r, technologies: ['typescript'], projectAgents: ['codex', 'gemini'] });
    expect(fs.realpathSync(projectIndexFile(r))).toBe(fs.realpathSync(projectCanonicalIndex(r)));
    expect(fs.realpathSync(projectGeminiFile(r))).toBe(fs.realpathSync(projectCanonicalIndex(r)));
    const gi = fs.readFileSync(path.join(r, '.gitignore'), 'utf8');
    expect(gi).toContain('/AGENTS.md');
    expect(gi).toContain('/GEMINI.md');
    expect(gi).toContain('/.github/copilot-instructions.md');
    // idempotent: second run does not duplicate the gitignore block
    runSync({ root: r, technologies: ['typescript'], projectAgents: ['codex', 'gemini'] });
    const gi2 = fs.readFileSync(path.join(r, '.gitignore'), 'utf8');
    expect(gi2.match(/seh — generated tool symlinks/g)?.length).toBe(1);
  });
  it('writes stack modules and lock file', () => {
    const r = repoWithProject();
    const res = runSync({ root: r, technologies: ['typescript'], projectAgents: [] });
    expect(fs.existsSync(path.join(r, '.seh', 'stack', 'typescript.md'))).toBe(true);
    expect(res.written).toContain('.seh/AGENTS.md');
    expect(res.written).toContain('seh.lock');
    const lock = JSON.parse(fs.readFileSync(path.join(r, 'seh.lock'), 'utf8'));
    expect(lock.version).toBe('0.2.0');
    expect(lock.technologies).toEqual(['typescript']);
  });
  it('throws on unknown technology', () => {
    const r = repoWithProject();
    expect(() => runSync({ root: r, technologies: ['cobol'], projectAgents: [] }))
      .toThrow('Unknown technology: cobol');
  });
});

describe('runSync with resolver', () => {
  it('uses package stack module when present', () => {
    const r = repoWithProject();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageTemplatesStackDir(pkg), { recursive: true });
    fs.writeFileSync(path.join(packageTemplatesStackDir(pkg), 'typescript.md'), '# Custom TS\n');
    const resolver = new PackageResolver(pkg);
    runSync({ root: r, technologies: ['typescript'], projectAgents: [], resolver });
    const content = fs.readFileSync(path.join(r, '.seh', 'stack', 'typescript.md'), 'utf8');
    expect(content).toBe('# Custom TS\n');
  });

  it('applies project overlay from package', () => {
    const r = repoWithProject();
    const repoName = path.basename(r);
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    const overlayDir = path.join(packageProjectsDir(pkg), repoName);
    fs.mkdirSync(overlayDir, { recursive: true });
    fs.writeFileSync(path.join(overlayDir, 'project.md'), '# Overlay Project\n');
    const resolver = new PackageResolver(pkg);
    const res = runSync({ root: r, technologies: ['typescript'], projectAgents: [], resolver });
    expect(fs.readFileSync(path.join(r, '.seh', 'project.md'), 'utf8')).toBe('# Overlay Project\n');
    expect(res.written).toContain(path.join('.seh', 'project.md'));
  });

  it('no-ops overlay when no matching project in package', () => {
    const r = repoWithProject();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageProjectsDir(pkg), { recursive: true });
    const resolver = new PackageResolver(pkg);
    expect(() => runSync({ root: r, technologies: ['typescript'], projectAgents: [], resolver })).not.toThrow();
  });
});
