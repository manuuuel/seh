import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { packageHarnessJson } from './paths.js';
import type { HarnessPackage } from './types.js';

/** A git-backed unit distributed by a harness package. */
export type UnitKind = 'skills' | 'plugins';

export function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/** Clone `url` at `ref` into `dest`, replacing it, without carrying `.git` along. */
export function cloneAt(url: string, ref: string, dest: string): void {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehunit-'));
  try {
    execSync(`git clone --depth 1 --branch ${ref} ${url} ${tmp}`, { stdio: 'pipe' });
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    copyDir(tmp, dest);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function readHarness(packagePath: string): HarnessPackage | null {
  const p = packageHarnessJson(packagePath);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function requireHarness(packagePath: string): HarnessPackage {
  const harness = readHarness(packagePath);
  if (!harness) throw new Error(`No harness.json at ${packagePath}`);
  return harness;
}

export function writeHarness(packagePath: string, harness: HarnessPackage): void {
  fs.writeFileSync(packageHarnessJson(packagePath), JSON.stringify(harness, null, 2) + '\n');
}

export function addToGitignore(packagePath: string, entry: string): void {
  const gi = path.join(packagePath, '.gitignore');
  const existing = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (existing.includes(entry)) return;
  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(gi, existing + sep + entry + '\n');
}
