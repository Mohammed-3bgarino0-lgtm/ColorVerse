import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(rootDir, 'firebase-dist');

const requiredFiles = ['index.html', 'create.html', 'book-print-v2.html'];
const requiredDirectories = ['public'];

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const relativePath of requiredFiles) {
  const source = resolve(rootDir, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing required Firebase Hosting file: ${relativePath}`);
  }
  cpSync(source, resolve(outputDir, relativePath));
}

for (const relativePath of requiredDirectories) {
  const source = resolve(rootDir, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing required Firebase Hosting directory: ${relativePath}`);
  }
  cpSync(source, resolve(outputDir, relativePath), { recursive: true });
}

console.log(`Firebase Hosting bundle prepared at ${outputDir}`);
