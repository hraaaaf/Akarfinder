import {readFile,writeFile} from 'node:fs/promises';
const files=['README.md','docs/ROADMAP.md','docs/SESSION.md'];
const marker='UX-SHELL-WHITE-HEADER-1';
for(const p of files){
  let s=await readFile(p,'utf8');
  if(s.includes(marker)) continue;
  const note=`\n\n## ${marker} ✅ CLOSED\n\n- PR #489 — light header locked to a white surface with the blue/light AkarFinder logo, including dark-OS contexts.\n- Header navigation/control contrast recalibrated for white; compact \`Mon projet\` remains legible and secondary.\n- Dark/transparent header variants preserved. Search, DATA, ranking, dedup and Map unchanged.\n- Behavioral head \`033a805470bd25004eca047fa72e06886027d93b\`: Product Design Reviewer PASS + Independent Release Certifier PASS; production build and TypeScript PASS.\n`;
  s+=note;
  await writeFile(p,s,'utf8');
}
console.log('docs closed');