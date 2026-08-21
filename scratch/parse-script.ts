import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'docs', 'TUTORIAL_SCRIPT.md');
const content = fs.readFileSync(filePath, 'utf-8');

const sceneBlocks = content.split(/^## Scene /m).slice(1);

const manifest: any[] = [];

sceneBlocks.forEach((block, idx) => {
  const linesRaw = block.split('\n\n').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('---') && !s.startsWith('#'));
  const firstLine = linesRaw.shift() || '';
  const titleMatch = firstLine.match(/^(\d+) — (.*)/);
  const sceneNum = idx + 1;
  const rawTitle = titleMatch ? titleMatch[2] : firstLine;
  const title = `${sceneNum}. ${rawTitle}`;

  let currentT = 500;
  const lines: any[] = [];

  linesRaw.forEach((text) => {
    // Clean markdown bold for word count
    const words = text.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length;
    const durationSec = Math.max(2.0, words / 2.5);
    const durationMs = Math.round(durationSec * 1000);
    lines.push({
      t: currentT,
      text,
      words,
      durationMs,
    });
    currentT += durationMs + 1000;
  });

  manifest.push({
    id: `scene-${String(sceneNum).padStart(2, '0')}`,
    title,
    durationMs: currentT + 1000,
    lines,
  });
});

console.log(JSON.stringify(manifest, null, 2));
