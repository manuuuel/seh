import fs from 'node:fs';
import path from 'node:path';
import { assetsDir } from '../paths.js';
import { SUPPORTED_TECHS } from '../catalog.js';
import { runSync } from './sync.js';

function templateFiles(): { relPath: string; content: string }[] {
  const base = path.join(assetsDir(), 'project-template');
  const out: { relPath: string; content: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.md')) {
        out.push({ relPath: path.relative(base, abs), content: fs.readFileSync(abs, 'utf8') });
      }
    }
  };
  walk(base);
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export function runInitProject(opts: {
  root: string;
  technologies: string[];
  force?: boolean;
}): { created: string[]; skipped: string[]; synced: string[] } {
  if (opts.technologies.length === 0) throw new Error('Select at least one technology');
  for (const t of opts.technologies) {
    if (!(SUPPORTED_TECHS as readonly string[]).includes(t)) {
      throw new Error(`Unknown technology: ${t}`);
    }
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const file of templateFiles()) {
    const dest = path.join(opts.root, file.relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && !opts.force) { skipped.push(file.relPath); continue; }
    fs.writeFileSync(dest, file.content);
    created.push(file.relPath);
  }

  const { written } = runSync({ root: opts.root, technologies: opts.technologies });
  return { created, skipped, synced: written };
}
