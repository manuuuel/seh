import fs from 'node:fs';
import path from 'node:path';
import { globalDir, globalIndexFile, globalModulesDir, globalConfigFile } from '../paths.js';
import { globalModules, globalPreamble } from '../catalog.js';
import { buildIndex, type IndexEntry } from '../index-emitter.js';

export function titleOf(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function runInitGlobal(opts: {
  home: string;
  tools?: string[];
  force?: boolean;
}): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  fs.mkdirSync(globalModulesDir(opts.home), { recursive: true });

  const mods = globalModules();
  const entries: IndexEntry[] = [];
  for (const mod of mods) {
    const rel = path.join('global', `${mod.name}.md`);
    entries.push({ title: titleOf(mod.content), relPath: `global/${mod.name}.md` });
    const dest = path.join(globalDir(opts.home), rel);
    if (fs.existsSync(dest) && !opts.force) { skipped.push(rel); continue; }
    fs.writeFileSync(dest, mod.content);
    created.push(rel);
  }

  const idx = globalIndexFile(opts.home);
  if (fs.existsSync(idx) && !opts.force) {
    skipped.push('AGENTS.md');
  } else {
    fs.writeFileSync(idx, buildIndex(globalPreamble(), entries));
    created.push('AGENTS.md');
  }

  const cfg = globalConfigFile(opts.home);
  if (fs.existsSync(cfg) && !opts.force) {
    skipped.push('config.json');
  } else {
    fs.writeFileSync(cfg, JSON.stringify({ tools: opts.tools ?? [] }, null, 2) + '\n');
    created.push('config.json');
  }

  return { created, skipped };
}
