import fs from 'node:fs';
import { globalDir, globalIndexFile, globalConfigFile } from '../paths.js';
import { globalModules, globalPreamble } from '../catalog.js';
import { buildDocument, buildSkillsSection } from '../index-emitter.js';
import type { PackageResolver } from '../package-resolver.js';
import type { SkillEntry } from '../types.js';

// Global sections, craftsmanship first (a forced, prominent principle), then the
// rest in filename order.
function orderedGlobalSections(): string[] {
  const mods = globalModules();
  const craft = mods.filter((m) => m.name === 'craftsmanship');
  const rest = mods.filter((m) => m.name !== 'craftsmanship');
  return [...craft, ...rest].map((m) => m.content);
}

export function buildGlobalAgentsMd(): string {
  return buildDocument(globalPreamble(), orderedGlobalSections());
}

export function runInitGlobal(opts: {
  home: string;
  agents?: string[];
  force?: boolean;
  resolver?: PackageResolver;
  skills?: Record<string, SkillEntry>;
}): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  fs.mkdirSync(globalDir(opts.home), { recursive: true });

  // The global harness is a SINGLE self-contained file (not an index).
  const idx = globalIndexFile(opts.home);
  if (fs.existsSync(idx) && !opts.force) {
    skipped.push('AGENTS.md');
  } else {
    let content = opts.resolver?.globalAgentsMd() ?? buildDocument(globalPreamble(), orderedGlobalSections());
    const skillsSection = opts.skills ? buildSkillsSection(opts.skills) : '';
    if (skillsSection) content = content.trimEnd() + '\n\n' + skillsSection + '\n';
    fs.writeFileSync(idx, content);
    created.push('AGENTS.md');
  }

  const cfg = globalConfigFile(opts.home);
  if (fs.existsSync(cfg) && !opts.force) {
    skipped.push('config.json');
  } else {
    fs.writeFileSync(cfg, JSON.stringify({ agents: opts.agents ?? [] }, null, 2) + '\n');
    created.push('config.json');
  }

  return { created, skipped };
}
