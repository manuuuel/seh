import { describe, it, expect } from 'vitest';
import { buildProgram } from '../src/cli.js';
import { SUPPORTED_TOOLS } from '../src/links.js';

describe('cli (v2)', () => {
  it('is named seh with a version', () => {
    const p = buildProgram();
    expect(p.name()).toBe('seh');
    expect(p.version()).toMatch(/\d+\.\d+\.\d+/);
  });
  it('registers the v2 commands', () => {
    const names = buildProgram().commands.map((c) => c.name()).sort();
    expect(names).toEqual(['check', 'init', 'link', 'sync']);
  });
  it('exposes all supported tools for global linking', () => {
    expect([...SUPPORTED_TOOLS]).toContain('gemini');
    expect([...SUPPORTED_TOOLS]).toContain('opencode');
    expect([...SUPPORTED_TOOLS]).toContain('copilot');
  });
});
