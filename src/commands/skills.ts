import fs from 'node:fs';
import { packageSkillDir, packageSkillsDir } from '../paths.js';
import type { SkillEntry, SkillInvoke } from '../types.js';
import { addToGitignore, cloneAt, requireHarness, writeHarness } from '../units.js';

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

  const harness = requireHarness(opts.packagePath);
  if (!harness.skills) harness.skills = {};

  if (opts.type === 'vendor') {
    cloneAt(opts.url, opts.ref ?? 'main', skillDir);
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
  const harness = requireHarness(opts.packagePath);
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
    cloneAt(entry.source, entry.ref, packageSkillDir(opts.packagePath, name));
    updated.push(name);
  }
  return { updated };
}

/** One row of `seh skills list`: a manifest entry, or a directory found on disk. */
export type SkillListing = {
  name: string;
  type: SkillEntry['type'];
  source?: string;
  ref?: string;
  onDisk: boolean;
  invoke?: SkillInvoke;
};

export function runSkillsList(opts: { packagePath: string }): { skills: SkillListing[] } {
  const harness = requireHarness(opts.packagePath);
  const skills: SkillListing[] = Object.entries(harness.skills ?? {}).map(([name, entry]) => ({
    name,
    type: entry.type,
    source: entry.type === 'reference' ? entry.source : undefined,
    ref: entry.type === 'reference' ? entry.ref : undefined,
    onDisk: fs.existsSync(packageSkillDir(opts.packagePath, name)),
    invoke: entry.invoke,
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
