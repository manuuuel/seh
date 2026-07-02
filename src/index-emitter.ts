import { BANNER } from './banner.js';

export type IndexEntry = { title: string; relPath: string; cue?: string };

export function titleOf(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function buildIndex(preamble: string, entries: IndexEntry[]): string {
  const links = entries
    .map((e) => (e.cue && e.cue.length > 0 ? `- [${e.title}](${e.relPath}) — ${e.cue}` : `- [${e.title}](${e.relPath})`))
    .join('\n');
  return [BANNER, preamble.trim(), '## Contents', links].join('\n\n') + '\n';
}

// Builds a single self-contained document: banner + preamble + all section
// bodies inlined in order (used for the unified global AGENTS.md).
export function buildDocument(preamble: string, sections: string[]): string {
  return [BANNER, preamble.trim(), ...sections.map((s) => s.trim())].join('\n\n') + '\n';
}
