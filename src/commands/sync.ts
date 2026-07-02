import fs from 'node:fs';
import path from 'node:path';
import { projectSehDir, projectStackDir, projectIndexFile, lockFile } from '../paths.js';
import { stackModule, projectPreamble } from '../catalog.js';
import { buildIndex, type IndexEntry } from '../index-emitter.js';
import { titleOf } from './initGlobal.js';

const VERSION = '0.2.0';

export function runSync(opts: {
  root: string;
  technologies: string[];
}): { written: string[] } {
  const written: string[] = [];
  const sehDir = projectSehDir(opts.root);
  const stackDir = projectStackDir(opts.root);
  fs.mkdirSync(stackDir, { recursive: true });

  // 1) write stack modules
  for (const tech of opts.technologies) {
    const dest = path.join(stackDir, `${tech}.md`);
    fs.writeFileSync(dest, stackModule(tech));
    written.push(path.join('.seh', 'stack', `${tech}.md`));
  }

  // 2) build index entries: project.md, then domain/*, then stack/*
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
  for (const tech of opts.technologies) {
    entries.push({ title: titleOf(stackModule(tech)), relPath: `.seh/stack/${tech}.md` });
  }

  fs.writeFileSync(projectIndexFile(opts.root), buildIndex(projectPreamble(), entries));
  written.push('AGENTS.md');

  const lock = { version: VERSION, technologies: opts.technologies, generatedAt: new Date().toISOString() };
  fs.writeFileSync(lockFile(opts.root), JSON.stringify(lock, null, 2) + '\n');
  written.push('seh.lock');

  return { written };
}
