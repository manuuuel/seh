import { BANNER } from './banner.js';
import type { SkillEntry } from './types.js';

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

export function buildSkillsSection(skills: Record<string, SkillEntry>): string {
  const always: string[] = [];
  const when: string[] = [];
  const optional: string[] = [];

  for (const [name, entry] of Object.entries(skills).sort(([a], [b]) => a.localeCompare(b))) {
    if (!entry.invoke) continue;
    if (entry.invoke.mode === 'always') {
      always.push(entry.invoke.label ? `- \`${name}\` — ${entry.invoke.label}` : `- \`${name}\``);
    } else if (entry.invoke.mode === 'when') {
      when.push(`- \`${name}\` — ${entry.invoke.condition}`);
    } else if (entry.invoke.mode === 'optional') {
      optional.push(`- \`${name}\``);
    }
  }

  if (always.length === 0 && when.length === 0 && optional.length === 0) return '';

  const parts: string[] = ['## Skills'];
  if (always.length > 0) parts.push(`Always invoke:\n${always.join('\n')}`);
  if (when.length > 0) parts.push(`Invoke when:\n${when.join('\n')}`);
  if (optional.length > 0) parts.push(`Optional:\n${optional.join('\n')}`);

  return parts.join('\n\n');
}
