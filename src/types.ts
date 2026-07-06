export type LockFile = {
  version: string;
  technologies: string[];
  generatedAt: string;
};

export type GlobalConfig = {
  tools: string[];
  packagePath?: string;
};

export type HarnessPackage = {
  name: string;
  version: string;
  description?: string;
  modelTag?: string;
};
