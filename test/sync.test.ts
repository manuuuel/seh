import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSync } from '../src/commands/sync.js';
import { projectCanonicalIndex, projectIndexFile, projectGeminiFile, projectSehDir } from '../src/paths.js';

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
    runSync({ root: r, technologies: ['typescript'], projectTools: [] });
    const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
    expect(idx).toContain('- [Project](.seh/project.md) — Read first');
    expect(idx).toContain('- [TypeScript Guidelines](.seh/stack/typescript.md) — Read before writing or reviewing TypeScript code.');
    expect(fs.existsSync(projectIndexFile(r))).toBe(false); // no tools => no symlinks
  });
  it('creates project symlinks for configured tools and gitignores them', () => {
    const r = repoWithProject();
    runSync({ root: r, technologies: ['typescript'], projectTools: ['codex', 'gemini'] });
    expect(fs.realpathSync(projectIndexFile(r))).toBe(fs.realpathSync(projectCanonicalIndex(r)));
    expect(fs.realpathSync(projectGeminiFile(r))).toBe(fs.realpathSync(projectCanonicalIndex(r)));
    const gi = fs.readFileSync(path.join(r, '.gitignore'), 'utf8');
    expect(gi).toContain('/AGENTS.md');
    expect(gi).toContain('/GEMINI.md');
    expect(gi).toContain('/.github/copilot-instructions.md');
    // idempotent: second run does not duplicate the gitignore block
    runSync({ root: r, technologies: ['typescript'], projectTools: ['codex', 'gemini'] });
    const gi2 = fs.readFileSync(path.join(r, '.gitignore'), 'utf8');
    expect(gi2.match(/seh — generated tool symlinks/g)?.length).toBe(1);
  });
  it('writes stack modules and lock file', () => {
    const r = repoWithProject();
    const res = runSync({ root: r, technologies: ['typescript'], projectTools: [] });
    expect(fs.existsSync(path.join(r, '.seh', 'stack', 'typescript.md'))).toBe(true);
    expect(res.written).toContain('.seh/AGENTS.md');
    expect(res.written).toContain('seh.lock');
    const lock = JSON.parse(fs.readFileSync(path.join(r, 'seh.lock'), 'utf8'));
    expect(lock.version).toBe('0.2.0');
    expect(lock.technologies).toEqual(['typescript']);
  });
  it('throws on unknown technology', () => {
    const r = repoWithProject();
    expect(() => runSync({ root: r, technologies: ['cobol'], projectTools: [] }))
      .toThrow('Unknown technology: cobol');
  });
});
