import fs from 'node:fs';
import path from 'node:path';
import { loadCore } from './core.js';
import { type Layer } from './generator.js';
import { projectHarnessDir, globalPrefsFile } from './paths.js';

export function buildLayers(root: string, home?: string): Layer[] {
  const core = loadCore();
  const layers: Layer[] = [
    { name: 'L0', source: 'core/PRINCIPLES.md', content: core.principles },
    { name: 'L0', source: 'core/AGENTS.base.md', content: core.agentsBase },
  ];

  const prefs = globalPrefsFile(home);
  if (fs.existsSync(prefs)) {
    layers.push({ name: 'L1', source: '~/.se-harness/preferences.md', content: fs.readFileSync(prefs, 'utf8') });
  }

  const hDir = projectHarnessDir(root);
  if (fs.existsSync(hDir)) {
    for (const f of fs.readdirSync(hDir).filter((x) => x.endsWith('.md')).sort()) {
      layers.push({ name: 'L2', source: `.harness/${f}`, content: fs.readFileSync(path.join(hDir, f), 'utf8') });
    }
  }

  return layers;
}
