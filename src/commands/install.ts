import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readGlobalConfig, linkSkill } from '../links.js';
import { PackageResolver } from '../package-resolver.js';
import { runInitGlobal } from './initGlobal.js';
import {
  packageSkillsDir, packageSkillDir,
  packageGlobalConfigJson, sehSkillsDir, sehSkillDir,
} from '../paths.js';
import { cloneAt, readHarness } from '../units.js';

function readPackageAgents(packagePath: string): string[] {
  const p = packageGlobalConfigJson(packagePath);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(raw.tools) && !raw.agents) return raw.tools as string[];
    return Array.isArray(raw.agents) ? (raw.agents as string[]) : [];
  } catch { return []; }
}

export function runPackageInstall(opts: {
  skills?: boolean;
  harness?: boolean;
  all?: boolean;
  agents?: string[];
  force?: boolean;
  home?: string;
}): { installedSkills: string[]; installedHarness: boolean } {
  const home = opts.home ?? os.homedir();
  const cfg = readGlobalConfig(home);
  if (!cfg.packagePath) throw new Error('No active package. Run `seh package use <path>` first.');

  const packagePath = cfg.packagePath;
  const doSkills = opts.skills || opts.all || false;
  const doHarness = opts.harness || opts.all || false;
  const installedSkills: string[] = [];
  let installedHarness = false;

  if (doHarness) {
    const resolver = new PackageResolver(packagePath);
    const packageAgents = readPackageAgents(packagePath);
    const skills = readHarness(packagePath)?.skills;
    runInitGlobal({ home, agents: packageAgents, resolver, force: opts.force, skills });
    installedHarness = true;
  }

  if (doSkills) {
    for (const [name, entry] of Object.entries(readHarness(packagePath)?.skills ?? {})) {
      if (entry.type !== 'reference') continue;
      const skillDir = packageSkillDir(packagePath, name);
      if (fs.existsSync(skillDir) && !opts.force) continue;
      cloneAt(entry.source, entry.ref, skillDir);
    }

    const skillsDir = packageSkillsDir(packagePath);
    if (!fs.existsSync(skillsDir)) return { installedSkills, installedHarness };

    fs.mkdirSync(sehSkillsDir(home), { recursive: true });
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const pkgSkillPath = packageSkillDir(packagePath, name);
      const sehTarget = sehSkillDir(home, name);

      if (fs.lstatSync(sehTarget, { throwIfNoEntry: false }) && !opts.force) continue;
      if (fs.lstatSync(sehTarget, { throwIfNoEntry: false })) {
        fs.rmSync(sehTarget, { force: true });
      }
      const rel = path.relative(path.dirname(sehTarget), pkgSkillPath);
      fs.symlinkSync(rel, sehTarget);

      for (const agent of opts.agents ?? []) {
        linkSkill(agent, name, home, sehTarget);
      }
      installedSkills.push(name);
    }
  }

  return { installedSkills, installedHarness };
}
