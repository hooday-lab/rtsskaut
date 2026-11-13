// Składa katalog dist/ ze wszystkich plików strony RTS Skaut (lista dozwolonych).
// Na stronę trafia tylko to, co jest tutaj wymienione. Kod Workera, testy i dokumentacja zostają poza nią.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');
const files = ['index.html', 'sw.js', 'config.js'];
const dirs = ['brand'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of files) {
  if (!existsSync(resolve(root, f))) throw new Error('Brak pliku strony: ' + f);
  cpSync(resolve(root, f), resolve(out, f));
}
for (const d of dirs) cpSync(resolve(root, d), resolve(out, d), { recursive: true });
console.log('dist gotowy:', files.join(', '), dirs.map((d) => d + '/').join(', '));
