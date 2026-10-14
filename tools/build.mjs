import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'portrait-color.css', 'app.mjs', 'content.mjs', 'okrugs.mjs', 'map.mjs', 'favicon.svg', 'robots.txt', 'assets']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
console.log('Static site built in dist/');
