import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runSkillsAdd, runSkillsUpdate, runSkillsList } from '../src/commands/skills.js';
import { runPackageInit } from '../src/commands/package.js';
import { packageSkillDir, packageHarnessJson } from '../src/paths.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehsk-'));
}

function tmpPkg(): string {
  const base = tmpDir();
  const p = path.join(base, 'my-harness');
  runPackageInit({ packagePath: p });
  return p;
}

function tmpGitRepo(fileName: string, content: string): string {
  const repo = tmpDir();
  execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.email "t@t.com"', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.name "T"', { cwd: repo, stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, fileName), content);
  execSync('git add .', { cwd: repo, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: repo, stdio: 'pipe' });
  return repo;
}

describe('runSkillsAdd --vendor', () => {
  it('clones skill files into package/skills/<name>/', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('caveman.md', '# Caveman\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'caveman', type: 'vendor', packagePath: pkg });
    expect(fs.existsSync(packageSkillDir(pkg, 'caveman'))).toBe(true);
    expect(fs.readFileSync(path.join(packageSkillDir(pkg, 'caveman'), 'caveman.md'), 'utf8')).toBe('# Caveman\n');
  });

  it('does not leave a .git directory in the skill dir', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# Skill\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
    expect(fs.existsSync(path.join(packageSkillDir(pkg, 'myskill'), '.git'))).toBe(false);
  });

  it('writes vendor entry to harness.json', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# X\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.myskill?.type).toBe('vendor');
  });

  it('throws when skill already exists without --force', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# X\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg });
    expect(() => runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg }))
      .toThrow('already exists');
  });

  it('overwrites with --force', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# X\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg });
    expect(() => runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg, force: true }))
      .not.toThrow();
  });
});

describe('runSkillsAdd --reference', () => {
  it('adds reference entry to harness.json without fetching files', () => {
    const pkg = tmpPkg();
    runSkillsAdd({
      url: 'https://github.com/JuliusBrussee/caveman',
      skillName: 'caveman',
      type: 'reference',
      ref: 'main',
      packagePath: pkg,
    });
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.caveman?.type).toBe('reference');
    expect(harness.skills?.caveman?.source).toBe('https://github.com/JuliusBrussee/caveman');
    expect(harness.skills?.caveman?.ref).toBe('main');
    expect(fs.existsSync(packageSkillDir(pkg, 'caveman'))).toBe(false);
  });

  it('appends skill dir to package .gitignore', () => {
    const pkg = tmpPkg();
    runSkillsAdd({
      url: 'https://github.com/JuliusBrussee/caveman',
      skillName: 'caveman',
      type: 'reference',
      packagePath: pkg,
    });
    const gi = fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8');
    expect(gi).toContain('skills/caveman/');
  });

  it('does not duplicate .gitignore entry on re-run', () => {
    const pkg = tmpPkg();
    runSkillsAdd({ url: 'https://github.com/x/y', skillName: 'y', type: 'reference', packagePath: pkg });
    runSkillsAdd({ url: 'https://github.com/x/y', skillName: 'y', type: 'reference', packagePath: pkg, force: true });
    const gi = fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8');
    expect((gi.match(/skills\/y\//g) ?? []).length).toBe(1);
  });
});

describe('runSkillsUpdate', () => {
  it('re-fetches a referenced skill from local repo', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('caveman.md', '# v1\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'caveman', type: 'reference', ref: 'main', packagePath: pkg });
    fs.mkdirSync(packageSkillDir(pkg, 'caveman'), { recursive: true });
    fs.writeFileSync(path.join(packageSkillDir(pkg, 'caveman'), 'caveman.md'), '# old\n');
    const { updated } = runSkillsUpdate({ skillName: 'caveman', packagePath: pkg });
    expect(updated).toContain('caveman');
    expect(fs.readFileSync(path.join(packageSkillDir(pkg, 'caveman'), 'caveman.md'), 'utf8')).toBe('# v1\n');
  });

  it('throws when skill is not in harness.json', () => {
    const pkg = tmpPkg();
    expect(() => runSkillsUpdate({ skillName: 'nonexistent', packagePath: pkg })).toThrow("not found");
  });

  it('throws when skill is vendored', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('s.md', '# S\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
    expect(() => runSkillsUpdate({ skillName: 'myskill', packagePath: pkg })).toThrow('vendored');
  });
});

describe('runSkillsList', () => {
  it('returns empty list when no skills', () => {
    const pkg = tmpPkg();
    expect(runSkillsList({ packagePath: pkg }).skills).toEqual([]);
  });

  it('lists vendor and reference skills from harness.json', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('v.md', '# V\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'vendor-skill', type: 'vendor', packagePath: pkg });
    runSkillsAdd({ url: 'https://github.com/x/ref', skillName: 'ref-skill', type: 'reference', packagePath: pkg });
    const { skills } = runSkillsList({ packagePath: pkg });
    expect(skills.find(s => s.name === 'vendor-skill')?.type).toBe('vendor');
    expect(skills.find(s => s.name === 'ref-skill')?.type).toBe('reference');
    expect(skills.find(s => s.name === 'ref-skill')?.source).toBe('https://github.com/x/ref');
    expect(skills.find(s => s.name === 'vendor-skill')?.onDisk).toBe(true);
    expect(skills.find(s => s.name === 'ref-skill')?.onDisk).toBe(false);
  });
});
