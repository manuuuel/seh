import fs from 'node:fs';
import path from 'node:path';
import { projectIndexFile, projectStackDir, lockFile } from '../paths.js';
import { stackModule } from '../catalog.js';
import { buildProjectIndex } from './sync.js';

export function runCheck(opts: { root: string }): { ok: boolean; drift: string[]; missing: string[] } {
  const drift: string[] = [];
  const missing: string[] = [];

  const lockPath = lockFile(opts.root);
  if (!fs.existsSync(lockPath)) {
    return { ok: false, drift: [], missing: ['seh.lock'] };
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as { technologies: string[] };
  const techs = lock.technologies ?? [];

  // index
  const idxPath = projectIndexFile(opts.root);
  const expectedIdx = buildProjectIndex(opts.root, techs);
  if (!fs.existsSync(idxPath)) missing.push('AGENTS.md');
  else if (fs.readFileSync(idxPath, 'utf8') !== expectedIdx) drift.push('AGENTS.md');

  // stack modules
  for (const tech of techs) {
    const rel = `.seh/stack/${tech}.md`;
    const p = path.join(projectStackDir(opts.root), `${tech}.md`);
    const expected = stackModule(tech);
    if (!fs.existsSync(p)) missing.push(rel);
    else if (fs.readFileSync(p, 'utf8') !== expected) drift.push(rel);
  }

  return { ok: drift.length === 0 && missing.length === 0, drift, missing };
}
