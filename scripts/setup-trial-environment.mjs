import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(process.cwd(), '.env.example');
const target = resolve(process.cwd(), '.env');

try {
  await access(target, constants.F_OK);
  console.log('[ColorVerse] .env already exists; no values were overwritten.');
  console.log('[ColorVerse] Keep trial switches false until the safe demo succeeds.');
} catch {
  await copyFile(source, target);
  console.log('[ColorVerse] Created .env from .env.example.');
  console.log('[ColorVerse] Trial mode is active: live AI and Drive writes are disabled.');
}

console.log('[ColorVerse] Open system-readiness.html after starting the Node server.');
