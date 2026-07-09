import { describe, it, expect } from 'vitest';
import * as p from '../src/paths.js';

describe('paths (v2)', () => {
  it('builds host global paths under ~/.seh', () => {
    expect(p.globalDir('/h')).toBe('/h/.seh');
    expect(p.globalIndexFile('/h')).toBe('/h/.seh/AGENTS.md');
    expect(p.globalModulesDir('/h')).toBe('/h/.seh/global');
    expect(p.globalConfigFile('/h')).toBe('/h/.seh/config.json');
    expect(p.claudeGlobalFile('/h')).toBe('/h/.claude/CLAUDE.md');
  });
  it('builds project paths under .seh', () => {
    expect(p.projectSehDir('/r')).toBe('/r/.seh');
    expect(p.projectIndexFile('/r')).toBe('/r/AGENTS.md');
    expect(p.projectStackDir('/r')).toBe('/r/.seh/stack');
    expect(p.lockFile('/r')).toBe('/r/seh.lock');
  });
  it('resolves assets dir', () => {
    expect(p.assetsDir().endsWith('assets')).toBe(true);
  });
  it('builds per-tool global targets', () => {
    expect(p.codexGlobalFile('/h')).toBe('/h/.codex/AGENTS.md');
    expect(p.piGlobalFile('/h')).toBe('/h/.pi/agent/AGENTS.md');
    expect(p.geminiGlobalFile('/h')).toBe('/h/.gemini/GEMINI.md');
    expect(p.opencodeGlobalFile('/h')).toBe('/h/.config/opencode/AGENTS.md');
    expect(p.copilotGlobalFile('/h')).toBe('/h/.copilot/copilot-instructions.md');
  });
  it('builds canonical + per-tool project targets', () => {
    expect(p.projectCanonicalIndex('/r')).toBe('/r/.seh/AGENTS.md');
    expect(p.projectClaudeFile('/r')).toBe('/r/CLAUDE.md');
    expect(p.projectGeminiFile('/r')).toBe('/r/GEMINI.md');
    expect(p.projectCopilotFile('/r')).toBe('/r/.github/copilot-instructions.md');
  });
  it('projectMemoryDir returns .seh/memory under root', () => {
    expect(p.projectMemoryDir('/my/project')).toBe('/my/project/.seh/memory');
  });
  it('projectMemoryFile returns .seh/memory/<name>.md under root', () => {
    expect(p.projectMemoryFile('/my/project', 'auth-strategy')).toBe('/my/project/.seh/memory/auth-strategy.md');
  });
});
