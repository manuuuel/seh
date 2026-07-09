import fs from 'node:fs';
import path from 'node:path';
import { projectMemoryDir, projectMemoryFile } from '../paths.js';
import type { MemoryEntry, MemoryType } from '../types.js';

const VALID_TYPES: MemoryType[] = ['decision', 'constraint', 'learning', 'problem'];

function parseFrontmatter(content: string): MemoryType | null {
  const m = content.match(/^---\s*\ntype:\s*(\w+)\s*\n---/);
  if (!m) return null;
  const t = m[1] as MemoryType;
  return VALID_TYPES.includes(t) ? t : null;
}

function memoryTemplate(name: string, type: MemoryType): string {
  return `---\ntype: ${type}\n---\n\n# ${name}\n\n\n`;
}

export function runMemoryAdd(opts: {
  root: string;
  name: string;
  type?: MemoryType;
}): { filePath: string; created: boolean } {
  const type = opts.type ?? 'decision';
  const filePath = projectMemoryFile(opts.root, opts.name);
  if (fs.existsSync(filePath)) return { filePath, created: false };
  fs.mkdirSync(projectMemoryDir(opts.root), { recursive: true });
  fs.writeFileSync(filePath, memoryTemplate(opts.name, type));
  return { filePath, created: true };
}

export function runMemoryList(opts: {
  root: string;
}): { entries: MemoryEntry[] } {
  const dir = projectMemoryDir(opts.root);
  if (!fs.existsSync(dir)) return { entries: [] };

  const entries: MemoryEntry[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const type = parseFrontmatter(content);
    if (!type) continue;
    const name = f.replace(/\.md$/, '');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : name;
    entries.push({ name, type, title, relPath: `.seh/memory/${f}` });
  }

  return { entries: entries.sort((a, b) => a.title.localeCompare(b.title)) };
}

export function runMemoryRemove(opts: {
  root: string;
  name: string;
}): void {
  const filePath = projectMemoryFile(opts.root, opts.name);
  if (!fs.existsSync(filePath)) throw new Error(`Memory '${opts.name}' not found`);
  fs.rmSync(filePath);
}
