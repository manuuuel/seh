import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildProgram } from '../src/cli.js';
import { SUPPORTED_AGENTS } from '../src/links.js';
import { packageHarnessJson } from '../src/paths.js';
import { runPackageInit, runPackageUse, runPackageStatus } from '../src/commands/package.js';
import * as packageModule from '../src/commands/package.js';
import * as skillsModule from '../src/commands/skills.js';

describe('cli (v2)', () => {
  it('is named seh with a version', () => {
    const p = buildProgram();
    expect(p.name()).toBe('seh');
    expect(p.version()).toMatch(/\d+\.\d+\.\d+/);
  });
  it('registers the v2 commands', () => {
    const names = buildProgram().commands.map((c) => c.name()).sort();
    expect(names).toEqual(['check', 'init', 'link', 'package', 'skills', 'sync']);
  });
  it('exposes all supported agents', () => {
    expect([...SUPPORTED_AGENTS]).toContain('gemini');
    expect([...SUPPORTED_AGENTS]).toContain('opencode');
    expect([...SUPPORTED_AGENTS]).toContain('copilot');
  });
});

describe('seh package commands (CLI)', () => {
  it('seh package init creates package at given path', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-'));
    const p = path.join(base, 'test-harness');
    await buildProgram().parseAsync(['node', 'seh', 'package', 'init', p]);
    expect(fs.existsSync(packageHarnessJson(p))).toBe(true);
  });

  it('seh package command group registers init, use, status subcommands', async () => {
    const program = buildProgram();
    const pkgCmd = program.commands.find((c) => c.name() === 'package');
    expect(pkgCmd).toBeDefined();
    const subNames = pkgCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('init');
    expect(subNames).toContain('use');
    expect(subNames).toContain('status');
  });
});

describe('seh skills commands (CLI)', () => {
  it('seh skills command group registers add, update, list subcommands', () => {
    const program = buildProgram();
    const skillsCmd = program.commands.find((c) => c.name() === 'skills');
    expect(skillsCmd).toBeDefined();
    const subNames = skillsCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('add');
    expect(subNames).toContain('update');
    expect(subNames).toContain('list');
  });

  it('seh package install command is registered', () => {
    const program = buildProgram();
    const pkgCmd = program.commands.find((c) => c.name() === 'package');
    expect(pkgCmd).toBeDefined();
    const subNames = pkgCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('install');
  });

  it('seh skills add with --always flag passes invoke.always to runSkillsAdd', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-home-'));
    try {
      const pkg = path.join(home, 'test-harness');
      runPackageInit({ packagePath: pkg, home });
      runPackageUse({ packagePath: pkg, home });

      const mockRunSkillsAdd = vi.spyOn(skillsModule, 'runSkillsAdd').mockImplementation(() => {});

      await buildProgram().parseAsync([
        'node', 'seh', 'skills', 'add', 'github:owner/repo-name', '--vendor', '--always', 'test label'
      ]);

      expect(mockRunSkillsAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          invoke: { mode: 'always', label: 'test label' },
          skillName: 'repo-name',
        })
      );

      mockRunSkillsAdd.mockRestore();
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('seh skills add with --always flag (no label) passes invoke with undefined label', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-home-'));
    try {
      const pkg = path.join(home, 'test-harness');
      runPackageInit({ packagePath: pkg, home });
      runPackageUse({ packagePath: pkg, home });

      const mockRunSkillsAdd = vi.spyOn(skillsModule, 'runSkillsAdd').mockImplementation(() => {});

      await buildProgram().parseAsync([
        'node', 'seh', 'skills', 'add', 'github:owner/test-skill', '--vendor', '--always'
      ]);

      expect(mockRunSkillsAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          invoke: { mode: 'always', label: undefined },
          skillName: 'test-skill',
        })
      );

      mockRunSkillsAdd.mockRestore();
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('seh skills add with --when flag passes invoke.when to runSkillsAdd', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-home-'));
    try {
      const pkg = path.join(home, 'test-harness');
      runPackageInit({ packagePath: pkg, home });
      runPackageUse({ packagePath: pkg, home });

      const mockRunSkillsAdd = vi.spyOn(skillsModule, 'runSkillsAdd').mockImplementation(() => {});

      await buildProgram().parseAsync([
        'node', 'seh', 'skills', 'add', 'github:owner/debug-skill', '--vendor', '--when', 'bug / test failure'
      ]);

      expect(mockRunSkillsAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          invoke: { mode: 'when', condition: 'bug / test failure' },
          skillName: 'debug-skill',
        })
      );

      mockRunSkillsAdd.mockRestore();
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('seh skills add with --optional flag passes invoke.optional to runSkillsAdd', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-home-'));
    try {
      const pkg = path.join(home, 'test-harness');
      runPackageInit({ packagePath: pkg, home });
      runPackageUse({ packagePath: pkg, home });

      const mockRunSkillsAdd = vi.spyOn(skillsModule, 'runSkillsAdd').mockImplementation(() => {});

      await buildProgram().parseAsync([
        'node', 'seh', 'skills', 'add', 'github:owner/opt-skill', '--vendor', '--optional'
      ]);

      expect(mockRunSkillsAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          invoke: { mode: 'optional' },
          skillName: 'opt-skill',
        })
      );

      mockRunSkillsAdd.mockRestore();
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('seh skills list displays invoke modes with correct formatting', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-'));
    try {
      const pkg = path.join(home, 'test-harness');
      runPackageInit({ packagePath: pkg, home });
      runPackageUse({ packagePath: pkg, home });

      // Create a skill directory so it shows as on-disk
      const skillsDir = path.join(pkg, 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.mkdirSync(path.join(skillsDir, 'debug-skill'), { recursive: true });

      // Write harness.json with a skill that has invoke.when
      const harnessPath = path.join(pkg, 'harness.json');
      const harness = {
        name: 'test-harness',
        version: '0.1.0',
        skills: {
          'debug-skill': {
            type: 'vendor',
            invoke: { mode: 'when', condition: 'bug / test failure' },
          },
        },
      };
      fs.writeFileSync(harnessPath, JSON.stringify(harness, null, 2) + '\n');

      // Mock runPackageStatus to return our test package
      const mockStatus = {
        packagePath: pkg,
        pkg: { name: 'test-harness', version: '0.1.0' },
        dirs: {},
      };
      const mockPackageStatus = vi.spyOn(packageModule, 'runPackageStatus').mockReturnValue(mockStatus as any);

      // Spy on console.log
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Run skills list
      await buildProgram().parseAsync(['node', 'seh', 'skills', 'list']);

      // Verify the invoke string was printed
      const calls = logSpy.mock.calls.map((c) => c[0] as string).join('\n');
      expect(calls).toContain('when: bug / test failure');
      expect(calls).toContain('debug-skill');

      mockPackageStatus.mockRestore();
      logSpy.mockRestore();
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
