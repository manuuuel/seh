// test/detect.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectTechnologies } from '../src/detect.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehdet-')); }
let root: string; let dirs: string[] = [];
beforeEach(() => { root = tmp(); dirs.push(root); });

describe('detectTechnologies', () => {
  it('detects js + ts from package.json + tsconfig', () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'tsconfig.json'), '{}');
    expect(detectTechnologies(root)).toEqual(['javascript', 'typescript']);
  });
  it('detects python, go, rust, java, c', () => {
    fs.writeFileSync(path.join(root, 'go.mod'), 'module x');
    fs.writeFileSync(path.join(root, 'Cargo.toml'), '');
    fs.writeFileSync(path.join(root, 'pyproject.toml'), '');
    fs.writeFileSync(path.join(root, 'pom.xml'), '');
    fs.writeFileSync(path.join(root, 'main.c'), '');
    expect(detectTechnologies(root)).toEqual(
      ['python', 'go', 'c', 'rust', 'java']);
  });
  it('returns [] for an empty repo', () => {
    expect(detectTechnologies(root)).toEqual([]);
  });
});
