import { BANNER } from './banner.js';

export type IndexEntry = { title: string; relPath: string };

export function titleOf(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function buildIndex(preamble: string, entries: IndexEntry[]): string {
  const links = entries.map((e) => `- [${e.title}](${e.relPath})`).join('\n');
  return [BANNER, preamble.trim(), '## Contents', links].join('\n\n') + '\n';
}
