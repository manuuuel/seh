import fs from 'node:fs';
import path from 'node:path';
import {
  projectCanonicalIndex, projectStackDir, lockFile,
  projectIndexFile, projectClaudeFile, projectGeminiFile, projectCopilotFile,
} from '../paths.js';
import { stackModule } from '../catalog.js';
import { buildProjectIndex } from './sync.js';
import type { LockFile } from '../types.js';

export function runCheck(opts: { root: string }): { ok: boolean; drift: string[]; missing: string[] } {
  const drift: string[] = [];
  const missing: string[] = [];

  const lockPath = lockFile(opts.root);
  if (!fs.existsSync(lockPath)) return { ok: false, drift: [], missing: ['seh.lock'] };
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockFile;
  const techs = lock.technologies ?? [];

  const idxPath = projectCanonicalIndex(opts.root);
  const expectedIdx = buildProjectIndex(opts.root, techs);
  if (!fs.existsSync(idxPath)) missing.push('.seh/AGENTS.md');
  else if (fs.readFileSync(idxPath, 'utf8') !== expectedIdx) drift.push('.seh/AGENTS.md');

  for (const tech of techs) {
    const rel = `.seh/stack/${tech}.md`;
    const p = path.join(projectStackDir(opts.root), `${tech}.md`);
    if (!fs.existsSync(p)) missing.push(rel);
    else if (fs.readFileSync(p, 'utf8') !== stackModule(tech)) drift.push(rel);
  }

  const targets: Array<[string, string]> = [
    ['AGENTS.md', projectIndexFile(opts.root)],
    ['CLAUDE.md', projectClaudeFile(opts.root)],
    ['GEMINI.md', projectGeminiFile(opts.root)],
    ['.github/copilot-instructions.md', projectCopilotFile(opts.root)],
  ];
  const canonicalReal = fs.existsSync(idxPath) ? fs.realpathSync(idxPath) : idxPath;
  for (const [label, target] of targets) {
    const stat = fs.lstatSync(target, { throwIfNoEntry: false });
    if (!stat) continue; // missing symlink is fine (per-developer / optional)
    const ok = stat.isSymbolicLink() && (() => { try { return fs.realpathSync(target) === canonicalReal; } catch { return false; } })();
    if (!ok) drift.push(`${label} (not a symlink to .seh/AGENTS.md)`);
  }

  return { ok: drift.length === 0 && missing.length === 0, drift, missing };
}
