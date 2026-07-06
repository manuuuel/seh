export type LockFile = {
  version: string;
  technologies: string[];
  generatedAt: string;
};

export type GlobalConfig = {
  agents: string[];
  packagePath?: string;
};

export type SkillEntry =
  | { type: 'vendor' }
  | { type: 'reference'; source: string; ref: string };

export type HarnessPackage = {
  name: string;
  version: string;
  description?: string;
  modelTag?: string;
  skills?: Record<string, SkillEntry>;
};
