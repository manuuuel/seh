export type LockFile = {
  version: string;
  technologies: string[];
  generatedAt: string;
};

export type GlobalConfig = {
  agents: string[];
  packagePath?: string;
};

export type SkillInvoke =
  | { mode: 'always'; label?: string }
  | { mode: 'when'; condition: string }
  | { mode: 'optional' };

export type SkillEntry =
  | { type: 'vendor'; invoke?: SkillInvoke }
  | { type: 'reference'; source: string; ref: string; invoke?: SkillInvoke };

export type HarnessPackage = {
  name: string;
  version: string;
  description?: string;
  modelTag?: string;
  skills?: Record<string, SkillEntry>;
};

export type MemoryType = 'decision' | 'constraint' | 'learning' | 'problem';

export type MemoryEntry = {
  name: string;
  type: MemoryType;
  title: string;
  relPath: string;
};
