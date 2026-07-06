import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildProgram } from '../src/cli.js';
import { SUPPORTED_TOOLS } from '../src/links.js';
import { packageHarnessJson } from '../src/paths.js';

describe('cli (v2)', () => {
  it('is named seh with a version', () => {
    const p = buildProgram();
    expect(p.name()).toBe('seh');
    expect(p.version()).toMatch(/\d+\.\d+\.\d+/);
  });
  it('registers the v2 commands', () => {
    const names = buildProgram().commands.map((c) => c.name()).sort();
    expect(names).toEqual(['check', 'init', 'link', 'package', 'sync']);
  });
  it('exposes all supported tools for global linking', () => {
    expect([...SUPPORTED_TOOLS]).toContain('gemini');
    expect([...SUPPORTED_TOOLS]).toContain('opencode');
    expect([...SUPPORTED_TOOLS]).toContain('copilot');
  });
});

describe('seh package commands (CLI)', () => {
  it('seh package init creates package at given path', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-'));
    const p = path.join(base, 'test-harness');
    await buildProgram().parseAsync(['node', 'seh', 'package', 'init', p]);
    expect(fs.existsSync(packageHarnessJson(p))).toBe(true);
  });

  it('seh package status prints "no active package" when none configured', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m: string) => logs.push(m));
    await buildProgram().parseAsync(['node', 'seh', 'package', 'status']);
    spy.mockRestore();
    expect(logs.some((l) => l.includes('no active package'))).toBe(true);
  });
});
