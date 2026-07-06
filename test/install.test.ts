import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPackageInstall } from '../src/commands/install.js';
import { runPackageInit, runPackageUse } from '../src/commands/package.js';
import { sehSkillDir, packageSkillDir, globalConfigFile } from '../src/paths.js';
import { SKILL_TARGETS } from '../src/links.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehins-'));
}

function tmpHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
}

function tmpPkgWithSkill(skillName: string): { pkg: string; home: string } {
  const base = tmpDir();
  const pkg = path.join(base, 'my-harness');
  runPackageInit({ packagePath: pkg });
  const skillDir = packageSkillDir(pkg, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, `${skillName}.md`), `# ${skillName}\n`);
  const hj = path.join(pkg, 'harness.json');
  const h = JSON.parse(fs.readFileSync(hj, 'utf8'));
  h.skills = { [skillName]: { type: 'vendor' } };
  fs.writeFileSync(hj, JSON.stringify(h, null, 2) + '\n');
  const home = tmpHome();
  return { pkg, home };
}

describe('runPackageInstall --skills', () => {
  it('creates ~/.seh/skills/<name>/ symlink into package', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    runPackageUse({ packagePath: pkg, home });
    const { installedSkills } = runPackageInstall({ skills: true, agents: [], home });
    expect(installedSkills).toContain('caveman');
    const sehTarget = sehSkillDir(home, 'caveman');
    expect(fs.lstatSync(sehTarget).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(sehTarget)).toBe(fs.realpathSync(packageSkillDir(pkg, 'caveman')));
  });

  it('creates agent skill symlink for claude', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    runPackageUse({ packagePath: pkg, home });
    runPackageInstall({ skills: true, agents: ['claude'], home });
    const claudeSkillDir = SKILL_TARGETS['claude']!(home, 'caveman');
    expect(fs.lstatSync(claudeSkillDir).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(claudeSkillDir)).toBe(fs.realpathSync(sehSkillDir(home, 'caveman')));
  });

  it('skips agents not in SKILL_TARGETS without error', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    runPackageUse({ packagePath: pkg, home });
    expect(() => runPackageInstall({ skills: true, agents: ['codex'], home })).not.toThrow();
  });

  it('throws when no active package', () => {
    const home = tmpHome();
    expect(() => runPackageInstall({ skills: true, agents: [], home })).toThrow('No active package');
  });
});

describe('runPackageInstall --harness', () => {
  it('writes ~/.seh/AGENTS.md from package global/', () => {
    const { pkg, home } = tmpPkgWithSkill('x');
    fs.writeFileSync(path.join(pkg, 'global', 'AGENTS.md'), '# My Rules\n');
    runPackageUse({ packagePath: pkg, home });
    const { installedHarness } = runPackageInstall({ harness: true, home });
    expect(installedHarness).toBe(true);
    expect(fs.readFileSync(path.join(home, '.seh', 'AGENTS.md'), 'utf8')).toBe('# My Rules\n');
  });
});

describe('runPackageInstall --all', () => {
  it('installs both harness and skills', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    fs.writeFileSync(path.join(pkg, 'global', 'AGENTS.md'), '# Rules\n');
    runPackageUse({ packagePath: pkg, home });
    const result = runPackageInstall({ all: true, agents: ['claude'], home });
    expect(result.installedHarness).toBe(true);
    expect(result.installedSkills).toContain('caveman');
  });
});
