import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SUPPORTED_TECHS, stackModule as bundledStackModule } from '../catalog.js';
import { buildGlobalAgentsMd } from './initGlobal.js';
import {
  globalIndexFile,
  globalConfigFile,
  packageHarnessJson,
  packageGlobalDir,
  packageGlobalAgentsMd,
  packageGlobalConfigJson,
  packageTemplatesStackDir,
  packageTemplatesProjectDir,
  packageProjectsDir,
} from '../paths.js';
import type { GlobalConfig, HarnessPackage } from '../types.js';

export function runPackageInit(opts: {
  packagePath: string;
  home?: string;
  force?: boolean;
}): { created: string[] } {
  const home = opts.home ?? os.homedir();
  const p = opts.packagePath;

  if (fs.existsSync(packageHarnessJson(p)) && !opts.force) {
    throw new Error(`harness package already exists at ${p}. Use --force to overwrite.`);
  }

  for (const d of [
    packageGlobalDir(p),
    packageTemplatesStackDir(p),
    packageTemplatesProjectDir(p),
    packageProjectsDir(p),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const pkg: HarnessPackage = {
    name: path.basename(p),
    version: '1.0.0',
    description: 'Personal coding harness',
  };
  fs.writeFileSync(packageHarnessJson(p), JSON.stringify(pkg, null, 2) + '\n');

  const existingGlobal = globalIndexFile(home);
  const globalContent = fs.existsSync(existingGlobal)
    ? fs.readFileSync(existingGlobal, 'utf8')
    : buildGlobalAgentsMd();
  fs.writeFileSync(packageGlobalAgentsMd(p), globalContent);
  fs.writeFileSync(packageGlobalConfigJson(p), JSON.stringify({ tools: [] }, null, 2) + '\n');

  for (const tech of SUPPORTED_TECHS) {
    fs.writeFileSync(
      path.join(packageTemplatesStackDir(p), `${tech}.md`),
      bundledStackModule(tech),
    );
  }

  fs.writeFileSync(
    path.join(p, 'CHANGELOG.md'),
    '# Harness Changelog\n\nRecord what you changed and why.\n',
  );

  return {
    created: [
      'harness.json',
      'CHANGELOG.md',
      'global/AGENTS.md',
      'global/config.json',
      ...SUPPORTED_TECHS.map((t) => `templates/stack/${t}.md`),
    ],
  };
}
