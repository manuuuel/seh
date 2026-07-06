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
  packageSkillsDir,
} from '../paths.js';
import type { HarnessPackage } from '../types.js';
import { readGlobalConfig } from '../links.js';

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
    packageSkillsDir(p),
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
  fs.writeFileSync(packageGlobalConfigJson(p), JSON.stringify({ agents: [] }, null, 2) + '\n');

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

export function runPackageUse(opts: {
  packagePath: string;
  home?: string;
}): void {
  const home = opts.home ?? os.homedir();
  const resolved = path.resolve(opts.packagePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`path does not exist: ${resolved}`);
  }
  if (!fs.existsSync(packageHarnessJson(resolved))) {
    throw new Error(`not a harness package (missing harness.json): ${resolved}`);
  }

  const cfgFile = globalConfigFile(home);
  const cfg = readGlobalConfig(home);
  cfg.packagePath = resolved;
  fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n');
}

export function runPackageStatus(opts: {
  home?: string;
}): { packagePath: string | null; pkg: HarnessPackage | null; dirs: Record<string, boolean> } {
  const home = opts.home ?? os.homedir();
  const cfgFile = globalConfigFile(home);
  if (!fs.existsSync(cfgFile)) return { packagePath: null, pkg: null, dirs: {} };

  let packagePath: string | null = null;
  try {
    const cfg = readGlobalConfig(home);
    packagePath = cfg.packagePath ?? null;
  } catch { /* */ }

  if (!packagePath) return { packagePath: null, pkg: null, dirs: {} };

  let pkg: HarnessPackage | null = null;
  const hj = packageHarnessJson(packagePath);
  if (fs.existsSync(hj)) {
    try { pkg = JSON.parse(fs.readFileSync(hj, 'utf8')); } catch { /* */ }
  }

  const dirs: Record<string, boolean> = {
    'global/': fs.existsSync(packageGlobalDir(packagePath)),
    'templates/stack/': fs.existsSync(packageTemplatesStackDir(packagePath)),
    'templates/project/': fs.existsSync(packageTemplatesProjectDir(packagePath)),
    'projects/': fs.existsSync(packageProjectsDir(packagePath)),
  };

  return { packagePath, pkg, dirs };
}
