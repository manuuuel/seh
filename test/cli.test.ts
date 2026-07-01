import { describe, it, expect } from 'vitest';
import { buildProgram } from '../src/cli.js';

describe('cli', () => {
  it('is named seh and exposes a version', () => {
    const program = buildProgram();
    expect(program.name()).toBe('seh');
    expect(program.version()).toMatch(/\d+\.\d+\.\d+/);
  });
});
