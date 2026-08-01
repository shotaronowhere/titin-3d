/** Node.js spec reader — reads data/*.json from disk. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', '..', 'data');

export function nodeReader(dataDir = DATA_DIR) {
  return async (name) => JSON.parse(await readFile(join(dataDir, name), 'utf8'));
}
