import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectSehDir, projectStackDir, projectCanonicalIndex, lockFile, projectMemoryDir } from '../paths.js';
import { stackModule, projectPreamble, stackCue, moduleCue, SUPPORTED_TECHS } from '../catalog.js';
import { buildIndex, buildSkillsSection, buildMemorySection, type IndexEntry, titleOf } from '../index-emitter.js';
import { linkAgent, readConfiguredAgents, SUPPORTED_AGENTS } from '../links.js';
import type { LockFile, SkillEntry, MemoryEntry } from '../types.js';
import { runMemoryList } from './memory.js';
import type { PackageResolver } from '../package-resolver.js';

const VERSION = '0.2.0';
const GITIGNORE_MARKER = '# seh — generated tool symlinks (regenerate with `seh sync`)';
const GITIGNORE_BLOCK = [
  GITIGNORE_MARKER,
  '/AGENTS.md',
  '/CLAUDE.md',
  '/GEMINI.md',
  '/.github/copilot-instructions.md',
].join('\n');

export function buildProjectIndex(
  root: string,
  technologies: string[],
  skills: Record<string, SkillEntry> = {},
  memoryEntries: MemoryEntry[] | null = null,
): string {
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
  let result = buildIndex(projectPreamble(), entries);

  const skillsSection = buildSkillsSection(skills);
  if (skillsSection) result = result.trimEnd() + '\n\n' + skillsSection + '\n';

  if (memoryEntries !== null) {
    result = result.trimEnd() + '\n\n' + buildMemorySection(memoryEntries) + '\n';
  }

  return result;
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
  projectAgents?: string[];
  home?: string;
  resolver?: PackageResolver;
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
    const content = opts.resolver ? opts.resolver.stackModule(tech) : stackModule(tech);
    fs.writeFileSync(path.join(stackDir, `${tech}.md`), content);
    written.push(path.join('.seh', 'stack', `${tech}.md`));
  }

  fs.mkdirSync(projectSehDir(opts.root), { recursive: true });
  const skills = opts.resolver ? opts.resolver.skills() : {};
  const memoryDir = projectMemoryDir(opts.root);
  const memoryEntries = fs.existsSync(memoryDir)
    ? runMemoryList({ root: opts.root }).entries
    : null;
  fs.writeFileSync(projectCanonicalIndex(opts.root), buildProjectIndex(opts.root, opts.technologies, skills, memoryEntries));
  written.push(path.join('.seh', 'AGENTS.md'));

  const lock: LockFile = { version: VERSION, technologies: opts.technologies, generatedAt: new Date().toISOString() };
  fs.writeFileSync(lockFile(opts.root), JSON.stringify(lock, null, 2) + '\n');
  written.push('seh.lock');

  if (opts.resolver) {
    const repoName = path.basename(opts.root);
    for (const { relPath, content } of opts.resolver.projectOverlayFiles(repoName)) {
      const dest = path.join(projectSehDir(opts.root), relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
      const normalized = path.join('.seh', relPath);
      if (!written.includes(normalized)) written.push(normalized);
    }
  }

  const agents = (opts.projectAgents ?? readConfiguredAgents(opts.home ?? os.homedir()))
    .filter((a) => (SUPPORTED_AGENTS as readonly string[]).includes(a));
  if (agents.length > 0) {
    for (const a of agents) linkAgent('project', a, opts.root);
    ensureGitignore(opts.root);
  }

  return { written };
}
