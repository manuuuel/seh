import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runMemoryAdd, runMemoryList, runMemoryRemove } from '../src/commands/memory.js';
import { projectMemoryDir, projectMemoryFile } from '../src/paths.js';

function tmpProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehmem-'));
  fs.mkdirSync(path.join(root, '.seh'), { recursive: true });
  return root;
}

describe('runMemoryAdd', () => {
  it('creates .seh/memory/<name>.md with decision frontmatter by default', () => {
    const root = tmpProject();
    runMemoryAdd({ root, name: 'auth-strategy' });
    const file = projectMemoryFile(root, 'auth-strategy');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf8');
    expect(content).toContain('type: decision');
  });

  it('creates file with specified type', () => {
    const root = tmpProject();
    runMemoryAdd({ root, name: 'rate-limiting', type: 'problem' });
    const content = fs.readFileSync(projectMemoryFile(root, 'rate-limiting'), 'utf8');
    expect(content).toContain('type: problem');
  });

  it('creates .seh/memory/ directory if missing', () => {
    const root = tmpProject();
    expect(fs.existsSync(projectMemoryDir(root))).toBe(false);
    runMemoryAdd({ root, name: 'test' });
    expect(fs.existsSync(projectMemoryDir(root))).toBe(true);
  });

  it('does not overwrite existing file', () => {
    const root = tmpProject();
    runMemoryAdd({ root, name: 'auth' });
    fs.writeFileSync(projectMemoryFile(root, 'auth'), '# Modified\n');
    runMemoryAdd({ root, name: 'auth' });
    const after = fs.readFileSync(projectMemoryFile(root, 'auth'), 'utf8');
    expect(after).toBe('# Modified\n');
  });

  it('returns the file path', () => {
    const root = tmpProject();
    const { filePath } = runMemoryAdd({ root, name: 'test' });
    expect(filePath).toBe(projectMemoryFile(root, 'test'));
  });

  it('throws on name with path separators', () => {
    const root = tmpProject();
    expect(() => runMemoryAdd({ root, name: '../danger' })).toThrow('Invalid memory name');
    expect(() => runMemoryAdd({ root, name: 'foo/bar' })).toThrow('Invalid memory name');
    expect(() => runMemoryAdd({ root, name: 'foo\\bar' })).toThrow('Invalid memory name');
  });
});

describe('runMemoryList', () => {
  it('returns empty array when memory dir missing', () => {
    const root = tmpProject();
    expect(runMemoryList({ root }).entries).toEqual([]);
  });

  it('returns empty array when memory dir empty', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    expect(runMemoryList({ root }).entries).toEqual([]);
  });

  it('reads entries from memory files', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'auth'), '---\ntype: decision\n---\n\n# Auth strategy\n\nChose JWT.\n');
    const { entries } = runMemoryList({ root });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('auth');
    expect(entries[0].type).toBe('decision');
    expect(entries[0].title).toBe('Auth strategy');
    expect(entries[0].relPath).toBe('.seh/memory/auth.md');
  });

  it('ignores files with invalid or missing type', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'bad'), '# No frontmatter\n');
    const { entries } = runMemoryList({ root });
    expect(entries).toHaveLength(0);
  });

  it('sorts entries alphabetically by title', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'z'), '---\ntype: decision\n---\n\n# Zebra\n');
    fs.writeFileSync(projectMemoryFile(root, 'a'), '---\ntype: decision\n---\n\n# Apple\n');
    const { entries } = runMemoryList({ root });
    expect(entries[0].title).toBe('Apple');
    expect(entries[1].title).toBe('Zebra');
  });
});

describe('runMemoryRemove', () => {
  it('deletes the memory file', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'auth'), '# X\n');
    runMemoryRemove({ root, name: 'auth' });
    expect(fs.existsSync(projectMemoryFile(root, 'auth'))).toBe(false);
  });

  it('throws when file does not exist', () => {
    const root = tmpProject();
    expect(() => runMemoryRemove({ root, name: 'nonexistent' }))
      .toThrow("Memory 'nonexistent' not found");
  });

  it('throws on name with path separators', () => {
    const root = tmpProject();
    expect(() => runMemoryRemove({ root, name: '../danger' })).toThrow('Invalid memory name');
    expect(() => runMemoryRemove({ root, name: 'foo/bar' })).toThrow('Invalid memory name');
    expect(() => runMemoryRemove({ root, name: 'foo\\bar' })).toThrow('Invalid memory name');
  });
});
