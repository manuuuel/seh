import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { readGlobalConfig, linkSkill } from '../links.js';
import { PackageResolver } from '../package-resolver.js';
import { runInitGlobal } from './initGlobal.js';
import {
  packageSkillsDir, packageSkillDir, packageHarnessJson,
  packageGlobalConfigJson, sehSkillsDir, sehSkillDir,
} from '../paths.js';
import type { HarnessPackage } from '../types.js';

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

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
    const hj = packageHarnessJson(packagePath);
    const skills = fs.existsSync(hj)
      ? (JSON.parse(fs.readFileSync(hj, 'utf8')) as HarnessPackage).skills
      : undefined;
    runInitGlobal({ home, agents: packageAgents, resolver, force: opts.force, skills });
    installedHarness = true;
  }

  if (doSkills) {
    const hj = packageHarnessJson(packagePath);
    if (fs.existsSync(hj)) {
      const harness: HarnessPackage = JSON.parse(fs.readFileSync(hj, 'utf8'));
      for (const [name, entry] of Object.entries(harness.skills ?? {})) {
        if (entry.type !== 'reference') continue;
        const skillDir = packageSkillDir(packagePath, name);
        if (fs.existsSync(skillDir) && !opts.force) continue;
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehins-'));
        try {
          execSync(`git clone --depth 1 --branch ${entry.ref} ${entry.source} ${tmp}`, { stdio: 'pipe' });
          if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
          copyDir(tmp, skillDir);
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      }
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
