import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mermaid in the recipe is authoritative; fixed rows keep the path horizontal.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdown = fs.readFileSync(path.join(root, 'docs-site/recipes/campaign-flow.md'), 'utf8');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const wrap = (label, limit) => label.split('<br/>').flatMap(part => {
  const lines = []; let line = '';
  for (const word of part.split(/\s+/)) {
    if (line && line.length + word.length + 1 > limit) { lines.push(line); line = word; }
    else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
});
const blocks = [...markdown.matchAll(/<!-- campaign-logic:([\w-]+) -->\n\n~~~text\n([\s\S]*?)\n~~~/g)];
if (blocks.length !== 13) throw new Error('Expected thirteen campaign Mermaid sources');
const recoveryLines = label => label.split('<br/>').flatMap((part, i) => wrap(part, i ? 30 : 31).map((text, j) => ({ text, title: i === 0, bullet: i > 0 && j === 0, gap: j === 0 && i > 0 ? 6 : 0 })));
const out = path.join(root, 'docs-site/public/diagrams');
fs.mkdirSync(out, { recursive: true });
for (const [, name, source] of blocks) {
  const nodes = [...source.matchAll(/^\s+(\w+)(\[|\{)("(?:[^"\\]|\\.)*")[\]}]$/gm)].map(([, id, shape, label]) => ({ id, decision: shape === '{', label: JSON.parse(label) }));
  const edges = [...source.matchAll(/^\s+(\w+) -->\s*(?:\|("(?:[^"\\]|\\.)*")\|)?\s*(\w+)$/gm)].map(([, a, label, b]) => ({ a, b, label: label ? JSON.parse(label) : '' }));
  const main = nodes.filter(n => !n.id.endsWith('x'));
  const branches = nodes.filter(n => n.id.endsWith('x'));
  const positions = new Map();
  const width = main.length * 460 + 40;
  const branchHeight = Math.max(280, ...branches.map(n => recoveryLines(n.label).reduce((h, line) => h + 22 + line.gap, 60)));
  const height = 340 + branchHeight + 30;
  main.forEach((n, i) => positions.set(n.id, { x: 40 + i * 460, y: n.decision ? 30 : 75, w: 320, h: n.decision ? 200 : 110 }));
  branches.forEach(n => {
    const incoming = edges.find(e => e.b === n.id);
    if (!incoming || !positions.has(incoming.a)) throw new Error('Missing branch owner: ' + n.id);
    positions.set(n.id, { x: positions.get(incoming.a).x, y: 340, w: 320, h: branchHeight });
  });
  const svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-labelledby="title description">',
    '<title id="title">'+escape(name.replaceAll('-', ' '))+' logic</title>',
    '<desc id="description">Read left to right. Recovery paths appear below their owning step. Return IDs identify where to resume.</desc>',
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#555" stroke-width="1.5"/></marker></defs>',
    '<rect width="100%" height="100%" fill="#fff"/>'];
  for (const e of edges) {
    const a = positions.get(e.a), b = positions.get(e.b);
    if (!a || !b) throw new Error('Unknown edge endpoint');
    const vertical = e.b.endsWith('x');
    const x1 = vertical ? a.x + a.w / 2 : a.x + a.w, y1 = vertical ? a.y + a.h : 130;
    const x2 = vertical ? b.x + b.w / 2 : b.x, y2 = vertical ? b.y : 130;
    svg.push('<path d="M '+x1+' '+y1+' L '+x2+' '+y2+'" stroke="#555" stroke-width="1.5" marker-end="url(#arrow)" fill="none"/>');
    if (e.label) {
      const tx = (x1 + x2) / 2, ty = (y1 + y2) / 2, lw = e.label.length * 7.7 + 16;
      svg.push('<rect x="'+(tx-lw/2)+'" y="'+(ty-12)+'" width="'+lw+'" height="24" fill="#fff"/>',
        '<text x="'+tx+'" y="'+(ty+5)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#333">'+escape(e.label)+'</text>');
    }
  }
  for (const n of nodes) {
    const p = positions.get(n.id), recovery = n.id.endsWith('x'), success = n.id === main.at(-1).id;
    const fill = recovery ? '#FFCDC2' : n.decision ? '#FFECBD' : success ? '#CDF4D3' : '#C2E5FF';
    const stroke = recovery ? '#FF7556' : n.decision ? '#FFC943' : success ? '#66D575' : '#3DADFF';
    if (n.decision) svg.push('<polygon points="'+(p.x+p.w/2)+','+p.y+' '+(p.x+p.w)+','+(p.y+p.h/2)+' '+(p.x+p.w/2)+','+(p.y+p.h)+' '+p.x+','+(p.y+p.h/2)+'" fill="'+fill+'" stroke="'+stroke+'"/>');
    else svg.push('<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="10" fill="'+fill+'" stroke="'+stroke+'"/>');
    if (recovery) {
      let y = p.y + 34;
      for (const line of recoveryLines(n.label)) {
        y += line.gap;
        if (line.bullet) svg.push('<text x="'+(p.x+22)+'" y="'+y+'" font-family="Arial,sans-serif" font-size="16" fill="#1E1E1E">•</text>');
        svg.push('<text x="'+(p.x+(line.title?24:42))+'" y="'+y+'" text-anchor="start" font-family="Arial,sans-serif" font-size="16" font-weight="'+(line.title?'700':'400')+'" fill="#1E1E1E">'+escape(line.text)+'</text>');
        y += 22;
      }
    } else {
      const lines = wrap(n.label, n.decision ? 22 : 30);
      const firstY = p.y + p.h/2 - (lines.length-1)*11 + 6;
      svg.push('<text text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#1E1E1E">');
      lines.forEach((line, i) => svg.push('<tspan x="'+(p.x+p.w/2)+'" y="'+(firstY+i*22)+'">'+escape(line)+'</tspan>'));
      svg.push('</text>');
    }
  }
  svg.push('</svg>');
  fs.writeFileSync(path.join(out, name+'.svg'), svg.join('\n')+'\n');
  fs.writeFileSync(path.join(out, name+'.mmd'), source+'\n');
  console.log(name+': '+nodes.length+' nodes, '+edges.length+' connections, '+width+' × '+height);
}
