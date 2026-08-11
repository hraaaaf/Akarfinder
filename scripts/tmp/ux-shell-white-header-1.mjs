import { readFile, writeFile } from 'node:fs/promises';

const p='components/layout/SiteHeader.tsx';
let s=await readFile(p,'utf8');

s=s.replace(
'            : "border-border/20 bg-white/94 text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-[rgba(7,27,51,0.97)] dark:text-white"',
'            : "border-slate-200/80 bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05)] backdrop-blur"'
);

s=s.replace(
'          {darkSurface || transparentActive ? (\n            <img\n              src="/brand/logo-v2/logo-header-dark.png"\n              alt="AkarFinder"\n              width={132}\n              height={33}\n              className={compact ? "h-[23px] w-auto sm:h-[28px]" : "h-[25px] w-auto sm:h-[34px]"}\n            />\n          ) : (\n            <>\n              <img\n                src="/brand/logo-v2/logo-header-light.png"\n                alt="AkarFinder"\n                width={132}\n                height={33}\n                className={compact ? "h-[23px] w-auto sm:h-[28px] dark:hidden" : "h-[25px] w-auto sm:h-[34px] dark:hidden"}\n              />\n              <img\n                src="/brand/logo-v2/logo-header-dark.png"\n                alt="AkarFinder"\n                width={132}\n                height={33}\n                className={compact ? "hidden h-[23px] w-auto sm:h-[28px] dark:block" : "hidden h-[25px] w-auto sm:h-[34px] dark:block"}\n              />\n            </>\n          )}',
'          {darkSurface || transparentActive ? (\n            <img\n              src="/brand/logo-v2/logo-header-dark.png"\n              alt="AkarFinder"\n              width={132}\n              height={33}\n              className={compact ? "h-[23px] w-auto sm:h-[28px]" : "h-[25px] w-auto sm:h-[34px]"}\n            />\n          ) : (\n            <img\n              src="/brand/logo-v2/logo-header-light.png"\n              alt="AkarFinder"\n              width={132}\n              height={33}\n              className={compact ? "h-[23px] w-auto sm:h-[28px]" : "h-[25px] w-auto sm:h-[34px]"}\n            />\n          )}'
);

s=s.replace('          : "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#0B63CE] dark:text-white"','          : "text-slate-900 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#0B63CE]"');
s=s.replace('          : "text-foreground/70 hover:bg-surface-muted hover:text-foreground dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"','          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"');
s=s.replace('                : "text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"','                : "text-slate-500 hover:bg-red-50 hover:text-red-500"');
s=s.replace('                : "border-border/20 bg-card text-foreground/80 hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/80"','                : "border-slate-200 bg-white text-slate-700 hover:border-[#0B63CE]/35 hover:text-slate-900"');
s=s.replace('              darkSurface || transparentActive ? "text-white hover:bg-white/10" : "text-foreground hover:bg-surface dark:text-white"','              darkSurface || transparentActive ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"');
s=s.replace(
'              compact\n                ? "rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-white/[0.14] sm:px-3.5 sm:text-[12.5px]"',
'              compact\n                ? darkSurface || transparentActive\n                  ? "rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-white/[0.14] sm:px-3.5 sm:text-[12.5px]"\n                  : "rounded-lg border border-[#0B63CE]/20 bg-[#0B63CE]/[0.06] px-3 py-1.5 text-[11.5px] font-bold text-[#0B63CE] transition hover:bg-[#0B63CE]/[0.10] sm:px-3.5 sm:text-[12.5px]"'
);

if(!s.includes('bg-white text-slate-900') || !s.includes('logo-header-light.png') || !s.includes('text-[#0B63CE] transition')) throw new Error('white header contract not applied');
await writeFile(p,s,'utf8');
console.log('white header applied');