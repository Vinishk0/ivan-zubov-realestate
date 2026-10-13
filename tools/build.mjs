import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.mjs', 'content.mjs', 'districts.mjs', 'map.mjs', 'favicon.svg', 'assets']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
console.log('Static site built in dist/');
