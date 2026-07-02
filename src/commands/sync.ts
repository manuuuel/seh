import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectSehDir, projectStackDir, projectCanonicalIndex, lockFile } from '../paths.js';
import { stackModule, projectPreamble, stackCue, moduleCue, SUPPORTED_TECHS } from '../catalog.js';
import { buildIndex, type IndexEntry, titleOf } from '../index-emitter.js';
import { linkTool, readConfiguredTools, SUPPORTED_TOOLS } from '../links.js';
import type { LockFile } from '../types.js';

const VERSION = '0.2.0';
const GITIGNORE_MARKER = '# seh — generated tool symlinks (regenerate with `seh sync`)';
const GITIGNORE_BLOCK = [
  GITIGNORE_MARKER,
  '/AGENTS.md',
  '/CLAUDE.md',
  '/GEMINI.md',
  '/.github/copilot-instructions.md',
].join('\n');

export function buildProjectIndex(root: string, technologies: string[]): string {
  const sehDir = projectSehDir(root);
  const entries: IndexEntry[] = [];
  const projectMd = path.join(sehDir, 'project.md');
  if (fs.existsSync(projectMd)) {
    entries.push({ title: titleOf(fs.readFileSync(projectMd, 'utf8')), relPath: '.seh/project.md', cue: moduleCue('.seh/project.md') });
  }
  const domainDir = path.join(sehDir, 'domain');
  if (fs.existsSync(domainDir)) {
    for (const f of fs.readdirSync(domainDir).filter((x) => x.endsWith('.md')).sort()) {
      const rel = `.seh/domain/${f}`;
      const content = fs.readFileSync(path.join(domainDir, f), 'utf8');
      entries.push({ title: titleOf(content), relPath: rel, cue: moduleCue(rel) });
    }
  }
  for (const tech of technologies) {
    entries.push({ title: titleOf(stackModule(tech)), relPath: `.seh/stack/${tech}.md`, cue: stackCue(tech) });
  }
  return buildIndex(projectPreamble(), entries);
}

function ensureGitignore(root: string): void {
  const gi = path.join(root, '.gitignore');
  const existing = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (existing.includes(GITIGNORE_MARKER)) return;
  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(gi, existing + sep + (existing.length > 0 ? '\n' : '') + GITIGNORE_BLOCK + '\n');
}

export function runSync(opts: {
  root: string;
  technologies: string[];
  projectTools?: string[];
  home?: string;
}): { written: string[] } {
  for (const tech of opts.technologies) {
    if (!(SUPPORTED_TECHS as readonly string[]).includes(tech)) {
      throw new Error(`Unknown technology: ${tech}`);
    }
  }

  const written: string[] = [];
  const stackDir = projectStackDir(opts.root);
  fs.mkdirSync(stackDir, { recursive: true });

  for (const tech of opts.technologies) {
    fs.writeFileSync(path.join(stackDir, `${tech}.md`), stackModule(tech));
    written.push(path.join('.seh', 'stack', `${tech}.md`));
  }

  fs.mkdirSync(projectSehDir(opts.root), { recursive: true });
  fs.writeFileSync(projectCanonicalIndex(opts.root), buildProjectIndex(opts.root, opts.technologies));
  written.push(path.join('.seh', 'AGENTS.md'));

  const lock: LockFile = { version: VERSION, technologies: opts.technologies, generatedAt: new Date().toISOString() };
  fs.writeFileSync(lockFile(opts.root), JSON.stringify(lock, null, 2) + '\n');
  written.push('seh.lock');

  const tools = (opts.projectTools ?? readConfiguredTools(opts.home ?? os.homedir()))
    .filter((t) => (SUPPORTED_TOOLS as readonly string[]).includes(t));
  if (tools.length > 0) {
    for (const t of tools) linkTool('project', t, opts.root);
    ensureGitignore(opts.root);
  }

  return { written };
}
