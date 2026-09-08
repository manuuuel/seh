import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

/**
 * seh is installed straight from git (`npm i -g github:manuuuel/seh`).
 *
 * pacote runs a "git dep preparation" step — a full `npm install` inside its
 * cache clone — whenever the manifest declares any of these scripts, or a
 * `workspaces` field. See pacote/lib/git.js #prepareDir.
 *
 * That inner install inherits `npm_config_global=true` from the outer
 * `npm i -g`, so it runs in global mode and links the global package name at
 * the throwaway clone dir instead of installing it. The result:
 *
 *   lib/node_modules/se-harness -> ~/.npm/_cacache/tmp/git-cloneXXXX
 *
 * npm then reaps that tmp dir, leaving a dangling entry that breaks the `seh`
 * binary and makes the *next* update abort with
 * `ENOTDIR: not a directory, rename '.../se-harness'`.
 *
 * `dist/` is committed, so there is nothing to prepare. Keeping these script
 * names out of the manifest skips preparation entirely and keeps git installs
 * repeatable. The build script is therefore named `compile`, not `build`.
 */
const PACOTE_PREPARE_TRIGGERS = [
  'postinstall',
  'build',
  'preinstall',
  'install',
  'prepack',
  'prepare',
] as const;

describe('package manifest — git-install safety', () => {
  it('declares no script that triggers npm git-dep preparation', () => {
    const declared = PACOTE_PREPARE_TRIGGERS.filter((s) => manifest.scripts?.[s]);
    expect(declared).toEqual([]);
  });

  it('declares no workspaces field', () => {
    expect(manifest.workspaces).toBeUndefined();
  });

  it('ships a prebuilt dist so no install-time build is needed', () => {
    expect(manifest.files).toContain('dist');
    expect(manifest.bin.seh).toBe('dist/cli.js');
    expect(fs.existsSync(path.join(repoRoot, manifest.bin.seh))).toBe(true);
  });

  it('keeps the compile script wired for release and CI', () => {
    expect(manifest.scripts.compile).toBeTruthy();
    expect(manifest.scripts.prepublishOnly).toContain('npm run compile');
  });
});
