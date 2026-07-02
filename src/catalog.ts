import fs from 'node:fs';
import path from 'node:path';
import { assetsDir } from './paths.js';

export const SUPPORTED_TECHS = [
  'javascript', 'typescript', 'python', 'go', 'c', 'rust', 'java',
] as const;

export function globalModules(): { name: string; content: string }[] {
  const dir = path.join(assetsDir(), 'core', 'global');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({
      name: f.replace(/\.md$/, ''),
      content: fs.readFileSync(path.join(dir, f), 'utf8'),
    }));
}

export function stackModule(tech: string): string {
  if (!(SUPPORTED_TECHS as readonly string[]).includes(tech)) {
    throw new Error(`Unknown technology: ${tech}`);
  }
  return fs.readFileSync(path.join(assetsDir(), 'stacks', `${tech}.md`), 'utf8');
}

export function globalPreamble(): string {
  return fs.readFileSync(path.join(assetsDir(), 'core', 'global-index-preamble.md'), 'utf8');
}

export function projectPreamble(): string {
  return fs.readFileSync(path.join(assetsDir(), 'core', 'project-index-preamble.md'), 'utf8');
}

export const TECH_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  c: 'C',
  rust: 'Rust',
  java: 'Java',
};

export function stackCue(tech: string): string {
  const label = TECH_LABELS[tech] ?? tech;
  return `Read before writing or reviewing ${label} code.`;
}

const MODULE_CUES: Record<string, string> = {
  '.seh/project.md': 'Read first — mission, constraints, and out-of-scope for this repo.',
  '.seh/domain/architecture.md': 'Read before changing structure, modules, or data flow.',
  '.seh/domain/glossary.md': 'Consult when you hit an unfamiliar domain term.',
};

export function moduleCue(relPath: string): string {
  return MODULE_CUES[relPath] ?? '';
}
