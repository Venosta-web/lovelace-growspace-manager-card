#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runE2ERuntimeHarness } from './e2e-runtime-harness.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, ...arguments_] = process.argv.slice(2);

function managedArguments(values) {
  const managedOptions = {};
  const playwrightArguments = [];
  const optionNames = new Map([
    ['--integration-root', 'integrationDirectory'],
    ['--workspace-root', 'workspaceDirectory'],
    ['--home-assistant-image', 'homeAssistantImage'],
  ]);
  let passthrough = false;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (passthrough) {
      playwrightArguments.push(value);
      continue;
    }
    if (value === '--') {
      passthrough = true;
      continue;
    }

    const [name, inlineValue] = value.split('=', 2);
    const optionName = optionNames.get(name);
    if (!optionName) {
      playwrightArguments.push(value);
      continue;
    }
    const optionValue = inlineValue ?? values[++index];
    if (!optionValue) throw new Error(`${name} requires a value`);
    managedOptions[optionName] = optionValue;
  }
  return { managedOptions, playwrightArguments };
}

try {
  const parsed =
    mode === 'managed'
      ? managedArguments(arguments_)
      : { managedOptions: {}, playwrightArguments: arguments_ };
  process.exitCode = await runE2ERuntimeHarness({
    mode,
    rootDirectory,
    ...parsed,
    environment: process.env,
  });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
