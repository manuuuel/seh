export type Adapter = {
  name: string;
  filename: string;
  wrap?: (body: string) => string;
};

export const ADAPTERS: Record<string, Adapter> = {
  claude: { name: 'claude', filename: 'CLAUDE.md' },
  agents: { name: 'agents', filename: 'AGENTS.md' },
};

export function getAdapters(names: string[]): Adapter[] {
  return names.map((n) => {
    const a = ADAPTERS[n];
    if (!a) throw new Error(`Unknown adapter: ${n}`);
    return a;
  });
}
