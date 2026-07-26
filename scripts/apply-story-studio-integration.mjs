import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const target = resolve(process.cwd(), process.argv[2] || 'create.html');
const runtimeTags = [
  '<script src="public/js/story-studio-runtime.js"></script>',
  '<script src="public/js/story-ai-client.js"></script>',
  '<script src="public/js/story-parent-review-runtime.js"></script>',
  '<script src="public/js/story-edition-mode-runtime.js"></script>',
  '<script src="public/js/story-image-client.js"></script>',
  '<script src="public/js/story-image-production-runtime.js"></script>',
  '<script src="public/js/story-pdf-link-runtime.js"></script>',
];

let source = await readFile(target, 'utf8');
const bodyClose = '</body>';
if (!source.includes(bodyClose)) {
  throw new Error(`Cannot connect story studio: ${target} has no closing </body> tag.`);
}

const missingTags = runtimeTags.filter((tag) => !source.includes(tag));
if (!missingTags.length) {
  console.log(`[ColorVerse] Story, review, separate editions, images, and PDF links are already connected: ${target}`);
  process.exit(0);
}

source = source.replace(bodyClose, `${missingTags.join('\n')}\n${bodyClose}`);
await writeFile(target, source, 'utf8');
console.log(`[ColorVerse] Connected ${missingTags.length} story integration file(s) to: ${target}`);
