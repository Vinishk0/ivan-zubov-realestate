import { mkdir, writeFile, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('assets', { recursive: true });
await mkdir('artifacts', { recursive: true });
const photos = {
  'portrait.jpg': ['photo-1560250097-0b93528c311a', 1000],
  'living.jpg': ['photo-1600210492486-724fe5c67fb0', 1600],
  'interior.jpg': ['photo-1600607687920-4e2a09cf159d', 1200],
  'architecture.jpg': ['photo-1600585154340-be6161a56a0c', 1400],
  'city.jpg': ['photo-1511818966892-d7d671e672a2', 1600],
};
const entries = Object.entries(photos).map(([name, [id, width]]) => [name, `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`]);
entries.push(['hero.mp4', 'https://assets.mixkit.co/videos/49806/49806-1080.mp4']);
await Promise.all(entries.map(async ([name, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`assets/${name}`, bytes);
  console.log(`${name}: ${Math.round(bytes.length / 1024)} KB`);
}));
// This optional asset preparation helper requires FFmpeg on PATH.
for (const args of [
  ['-hide_banner', '-loglevel', 'error', '-i', 'assets/hero.mp4', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', 'artifacts/hero-optimized.mp4'],
  ['-hide_banner', '-loglevel', 'error', '-ss', '2', '-i', 'assets/hero.mp4', '-frames:v', '1', '-q:v', '2', '-y', 'assets/hero.jpg']
]) {
  const result = spawnSync('ffmpeg', args, {stdio:'inherit'});
  if (result.status !== 0) throw new Error('FFmpeg failed; install it before regenerating assets');
}
await cp('artifacts/hero-optimized.mp4', 'assets/hero.mp4');
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
