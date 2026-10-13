import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('assets', { recursive: true });
const photos = {
  'hero.jpg': ['photo-1486406146926-c627a92ad1ab', 1920],
  'portrait.jpg': ['photo-1560250097-0b93528c311a', 1000],
  'living.jpg': ['photo-1600210492486-724fe5c67fb0', 1600],
  'interior.jpg': ['photo-1600607687920-4e2a09cf159d', 1200],
  'architecture.jpg': ['photo-1600585154340-be6161a56a0c', 1400],
  'city.jpg': ['photo-1511818966892-d7d671e672a2', 1600],
};
const entries = Object.entries(photos).map(([name, [id, width]]) => [name, `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`]);
entries.push(['hero.mp4', 'https://assets.mixkit.co/videos/49852/49852-720.mp4']);
await Promise.all(entries.map(async ([name, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`assets/${name}`, bytes);
  console.log(`${name}: ${Math.round(bytes.length / 1024)} KB`);
}));
const fontResponse = await fetch('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap', {headers: {'User-Agent': 'Mozilla/5.0'}});
if (!fontResponse.ok) throw new Error('Font stylesheet download failed');
let css = await fontResponse.text();
const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g))];
for (let i = 0; i < urls.length; i++) {
  const response = await fetch(urls[i]);
  if (!response.ok) throw new Error('Font download failed');
  const extension = urls[i].split('.').pop();
  const filename = `font-${i}.${extension}`;
  await writeFile(`assets/${filename}`, Buffer.from(await response.arrayBuffer()));
  css = css.replaceAll(urls[i], filename);
}
await writeFile('assets/fonts.css', css);
console.log(`Downloaded ${urls.length} font files`);
