#!/usr/bin/env node
import { Command } from 'commander';

declare function buildProgram(): Command;

export { buildProgram };
