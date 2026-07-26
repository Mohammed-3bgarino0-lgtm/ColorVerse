import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const target = resolve(process.cwd(), process.argv[2] || 'create.html');
const runtimeTag = '<script src="public/js/story-studio-runtime.js"></script>';

const source = await readFile(target, 'utf8');

if (source.includes(runtimeTag)) {
  console.log(`[ColorVerse] Story studio runtime already connected: ${target}`);
  process.exit(0);
}

const bodyClose = '</body>';
if (!source.includes(bodyClose)) {
  throw new Error(`Cannot connect story studio: ${target} has no closing </body> tag.`);
}

const updated = source.replace(bodyClose, `${runtimeTag}\n${bodyClose}`);
await writeFile(target, updated, 'utf8');
console.log(`[ColorVerse] Connected dynamic story studio runtime to: ${target}`);
