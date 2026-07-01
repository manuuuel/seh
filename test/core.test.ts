// test/core.test.ts
import { describe, it, expect } from 'vitest';
import { loadCore, projectTemplateFiles } from '../src/core.js';

describe('core assets', () => {
  it('loads principles and agent base', () => {
    const core = loadCore();
    expect(core.principles).toContain('Prime directives');
    expect(core.agentsBase).toContain('Read order');
  });
  it('lists project template files with .harness paths', () => {
    const files = projectTemplateFiles();
    const paths = files.map(f => f.relPath).sort();
    expect(paths).toEqual([
      '.harness/architecture.md',
      '.harness/conventions.md',
      '.harness/project.md',
      '.harness/stack.md',
    ]);
    expect(files.every(f => f.content.length > 0)).toBe(true);
  });
});
