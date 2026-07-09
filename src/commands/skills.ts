import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { packageSkillDir, packageSkillsDir, packageHarnessJson } from '../paths.js';
import type { HarnessPackage, SkillEntry, SkillInvoke } from '../types.js';

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

function addToGitignore(packagePath: string, entry: string): void {
  const gi = path.join(packagePath, '.gitignore');
  const existing = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (existing.includes(entry)) return;
  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(gi, existing + sep + entry + '\n');
}

function readHarness(packagePath: string): HarnessPackage {
  const p = packageHarnessJson(packagePath);
  if (!fs.existsSync(p)) throw new Error(`No harness.json at ${packagePath}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeHarness(packagePath: string, harness: HarnessPackage): void {
  fs.writeFileSync(packageHarnessJson(packagePath), JSON.stringify(harness, null, 2) + '\n');
}

export function runSkillsAdd(opts: {
  url: string;
  skillName: string;
  type: 'vendor' | 'reference';
  ref?: string;
  packagePath: string;
  force?: boolean;
  invoke?: SkillInvoke;
}): void {
  const skillDir = packageSkillDir(opts.packagePath, opts.skillName);

  if (fs.existsSync(skillDir) && !opts.force) {
    throw new Error(`Skill '${opts.skillName}' already exists at ${skillDir}. Use --force to overwrite.`);
  }

  const harness = readHarness(opts.packagePath);
  if (!harness.skills) harness.skills = {};

  if (opts.type === 'vendor') {
    const ref = opts.ref ?? 'main';
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehskv-'));
    try {
      execSync(`git clone --depth 1 --branch ${ref} ${opts.url} ${tmp}`, { stdio: 'pipe' });
      if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
      copyDir(tmp, skillDir);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    harness.skills[opts.skillName] = opts.invoke
      ? { type: 'vendor', invoke: opts.invoke }
      : { type: 'vendor' };
  } else {
    harness.skills[opts.skillName] = opts.invoke
      ? { type: 'reference', source: opts.url, ref: opts.ref ?? 'main', invoke: opts.invoke }
      : { type: 'reference', source: opts.url, ref: opts.ref ?? 'main' };
    addToGitignore(opts.packagePath, `skills/${opts.skillName}/`);
  }

  writeHarness(opts.packagePath, harness);
}

export function runSkillsUpdate(opts: {
  skillName?: string;
  packagePath: string;
}): { updated: string[] } {
  const harness = readHarness(opts.packagePath);
  const entries = Object.entries(harness.skills ?? {});
  const toUpdate = opts.skillName
    ? entries.filter(([name]) => name === opts.skillName)
    : entries.filter(([, entry]) => entry.type === 'reference');

  if (opts.skillName && toUpdate.length === 0) {
    throw new Error(`Skill '${opts.skillName}' not found in harness.json`);
  }

  const updated: string[] = [];
  for (const [name, entry] of toUpdate) {
    if (entry.type !== 'reference') {
      throw new Error(`Skill '${name}' is vendored — nothing to update`);
    }
    const skillDir = packageSkillDir(opts.packagePath, name);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehsku-'));
    try {
      execSync(`git clone --depth 1 --branch ${entry.ref} ${entry.source} ${tmp}`, { stdio: 'pipe' });
      if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
      copyDir(tmp, skillDir);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    updated.push(name);
  }
  return { updated };
}

export function runSkillsList(opts: {
  packagePath: string;
}): { skills: Array<{ name: string; type: string; source?: string; ref?: string; onDisk: boolean }> } {
  const harness = readHarness(opts.packagePath);
  const skills = Object.entries(harness.skills ?? {}).map(([name, entry]) => ({
    name,
    type: entry.type,
    source: entry.type === 'reference' ? entry.source : undefined,
    ref: entry.type === 'reference' ? entry.ref : undefined,
    onDisk: fs.existsSync(packageSkillDir(opts.packagePath, name)),
  }));

  const skillsDir = packageSkillsDir(opts.packagePath);
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !skills.find((s) => s.name === entry.name)) {
        skills.push({ name: entry.name, type: 'vendor', onDisk: true });
      }
    }
  }

  return { skills: skills.sort((a, b) => a.name.localeCompare(b.name)) };
}
