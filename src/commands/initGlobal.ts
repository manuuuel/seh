import fs from 'node:fs';
import path from 'node:path';
import { globalDir, globalPrefsFile, globalConfigFile, assetsDir } from '../paths.js';

export function runInitGlobal(opts: {
  home: string;
  force?: boolean;
}): { created: string[]; skipped: string[] } {
  fs.mkdirSync(globalDir(opts.home), { recursive: true });
  const created: string[] = [];
  const skipped: string[] = [];

  const prefsSrc = path.join(assetsDir(), 'global-template', 'preferences.md');
  const prefsDest = globalPrefsFile(opts.home);
  if (fs.existsSync(prefsDest) && !opts.force) {
    skipped.push('preferences.md');
  } else {
    fs.writeFileSync(prefsDest, fs.readFileSync(prefsSrc, 'utf8'));
    created.push('preferences.md');
  }

  const cfgDest = globalConfigFile(opts.home);
  if (fs.existsSync(cfgDest) && !opts.force) {
    skipped.push('config.json');
  } else {
    fs.writeFileSync(cfgDest, JSON.stringify({ defaultAdapters: ['claude', 'agents'] }, null, 2) + '\n');
    created.push('config.json');
  }

  return { created, skipped };
}
