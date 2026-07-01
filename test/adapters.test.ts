// test/adapters.test.ts
import { describe, it, expect } from 'vitest';
import { getAdapters, ADAPTERS } from '../src/adapters.js';

describe('adapters', () => {
  it('maps claude and agents to filenames', () => {
    expect(ADAPTERS.claude.filename).toBe('CLAUDE.md');
    expect(ADAPTERS.agents.filename).toBe('AGENTS.md');
  });
  it('resolves a list of adapters', () => {
    expect(getAdapters(['claude', 'agents']).map(a => a.filename))
      .toEqual(['CLAUDE.md', 'AGENTS.md']);
  });
  it('throws on unknown adapter', () => {
    expect(() => getAdapters(['nope'])).toThrow('Unknown adapter: nope');
  });
});
