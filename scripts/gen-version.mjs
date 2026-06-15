// Genera una versión única por build y la escribe en dos lugares que deben
// coincidir: el bundle (src/app/core/version.ts) y el archivo público
// (public/version.json) que el hosting sirve. La app compara ambos para
// detectar cuando hay una versión nueva publicada y pedir recargar.
import { writeFileSync } from 'node:fs';

const v = new Date().toISOString().replace(/[:.TZ-]/g, '').slice(0, 12); // p.ej. 202606151811

writeFileSync(
  'src/app/core/version.ts',
  `/**\n * Versión de la app (generada por scripts/gen-version.mjs en cada build).\n */\nexport const APP_VERSION: string = '${v}';\n`,
);
writeFileSync('public/version.json', JSON.stringify({ version: v }) + '\n');

console.log('Versión generada:', v);
