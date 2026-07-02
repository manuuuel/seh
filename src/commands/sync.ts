import fs from 'node:fs';
import path from 'node:path';
import { projectSehDir, projectStackDir, projectIndexFile, lockFile } from '../paths.js';
import { stackModule, projectPreamble } from '../catalog.js';
import { buildIndex, type IndexEntry, titleOf } from '../index-emitter.js';
import { SUPPORTED_TECHS } from '../catalog.js';
import type { LockFile } from '../types.js';

const VERSION = '0.2.0';

export function buildProjectIndex(root: string, technologies: string[]): string {
  const sehDir = projectSehDir(root);
  const entries: IndexEntry[] = [];
  const projectMd = path.join(sehDir, 'project.md');
  if (fs.existsSync(projectMd)) {
    entries.push({ title: titleOf(fs.readFileSync(projectMd, 'utf8')), relPath: '.seh/project.md' });
  }
  const domainDir = path.join(sehDir, 'domain');
  if (fs.existsSync(domainDir)) {
    for (const f of fs.readdirSync(domainDir).filter((x) => x.endsWith('.md')).sort()) {
      const content = fs.readFileSync(path.join(domainDir, f), 'utf8');
      entries.push({ title: titleOf(content), relPath: `.seh/domain/${f}` });
    }
  }
  for (const tech of technologies) {
    entries.push({ title: titleOf(stackModule(tech)), relPath: `.seh/stack/${tech}.md` });
  }
  return buildIndex(projectPreamble(), entries);
}

export function runSync(opts: {
  root: string;
  technologies: string[];
}): { written: string[] } {
  // Validate technologies
  for (const tech of opts.technologies) {
    if (!(SUPPORTED_TECHS as readonly string[]).includes(tech)) {
      throw new Error(`Unknown technology: ${tech}`);
    }
  }

  const written: string[] = [];
  const stackDir = projectStackDir(opts.root);
  fs.mkdirSync(stackDir, { recursive: true });

  // 1) write stack modules
  for (const tech of opts.technologies) {
    const dest = path.join(stackDir, `${tech}.md`);
    fs.writeFileSync(dest, stackModule(tech));
    written.push(path.join('.seh', 'stack', `${tech}.md`));
  }

  // 2) build and write index
  fs.writeFileSync(projectIndexFile(opts.root), buildProjectIndex(opts.root, opts.technologies));
  written.push('AGENTS.md');

  const lock: LockFile = { version: VERSION, technologies: opts.technologies, generatedAt: new Date().toISOString() };
  fs.writeFileSync(lockFile(opts.root), JSON.stringify(lock, null, 2) + '\n');
  written.push('seh.lock');

  return { written };
}
