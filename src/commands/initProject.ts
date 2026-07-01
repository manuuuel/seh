import fs from 'node:fs';
import path from 'node:path';
import { projectTemplateFiles } from '../core.js';

const MARKERS = ['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml'];

export function runInitProject(opts: {
  root: string;
  force?: boolean;
}): { created: string[]; skipped: string[]; detected: Record<string, boolean> } {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of projectTemplateFiles()) {
    const dest = path.join(opts.root, file.relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && !opts.force) {
      skipped.push(file.relPath);
    } else {
      fs.writeFileSync(dest, file.content);
      created.push(file.relPath);
    }
  }

  const detected: Record<string, boolean> = {};
  for (const m of MARKERS) detected[m] = fs.existsSync(path.join(opts.root, m));

  return { created, skipped, detected };
}
