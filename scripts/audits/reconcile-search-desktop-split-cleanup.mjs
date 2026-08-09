import fs from 'node:fs';
const path = 'scripts/audits/search-desktop-split-1-visual.mjs';
let s = fs.readFileSync(path, 'utf8');
const oldLine = '        if (split.visibleSecondaryCount !== 2) throw new Error(`${viewport.name}: mobile/tablet secondary content changed`);';
const newLine = '        if (split.visibleSecondaryCount !== 0) throw new Error(`${viewport.name}: split still shows ${split.visibleSecondaryCount} secondary map blocks`);';
if (!s.includes(oldLine)) throw new Error('Expected predecessor visual marker not found');
s = s.replace(oldLine, newLine);
fs.writeFileSync(path, s);
console.log('search-desktop-split visual predecessor reconciled');
