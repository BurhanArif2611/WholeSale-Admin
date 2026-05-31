#!/usr/bin/env node
/**
 * One-time migration: fontWeight → fontFamily (Poppins) across TS/TSX files.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'scripts', 'dist', 'coverage']);

const REPLACEMENTS = [
  [/fontWeight:\s*Typography\.black(\s*as\s*any)?/g, 'fontFamily: Fonts.bold'],
  [/fontWeight:\s*Typography\.extrabold(\s*as\s*any)?/g, 'fontFamily: Fonts.bold'],
  [/fontWeight:\s*Typography\.bold(\s*as\s*any)?/g, 'fontFamily: Fonts.bold'],
  [/fontWeight:\s*Typography\.semibold(\s*as\s*any)?/g, 'fontFamily: Fonts.semibold'],
  [/fontWeight:\s*Typography\.medium(\s*as\s*any)?/g, 'fontFamily: Fonts.medium'],
  [/fontWeight:\s*Typography\.regular(\s*as\s*any)?/g, 'fontFamily: Fonts.regular'],
  [/fontWeight:\s*['"]900['"]/g, 'fontFamily: Fonts.bold'],
  [/fontWeight:\s*['"]800['"]/g, 'fontFamily: Fonts.bold'],
  [/fontWeight:\s*['"]700['"]/g, 'fontFamily: Fonts.bold'],
  [/fontWeight:\s*['"]600['"]/g, 'fontFamily: Fonts.semibold'],
  [/fontWeight:\s*['"]500['"]/g, 'fontFamily: Fonts.medium'],
  [/fontWeight:\s*['"]400['"]/g, 'fontFamily: Fonts.regular'],
  [/fontWeight:\s*['"]300['"]/g, 'fontFamily: Fonts.light'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function ensureFontsImport(content, filePath) {
  if (!content.includes('Fonts.')) return content;
  if (/import\s*\{[^}]*\bFonts\b/.test(content)) return content;

  const themeImport = content.match(
    /import\s*\{([^}]+)\}\s*from\s*['"]@\/constants\/theme['"];?/,
  );
  if (themeImport) {
    const names = themeImport[1].trim();
    if (!names.includes('Fonts')) {
      return content.replace(
        themeImport[0],
        `import { ${names}, Fonts } from '@/constants/theme';`,
      );
    }
    return content;
  }

  const rel = path.relative(path.join(ROOT, 'constants'), filePath);
  const depth = rel.split(path.sep).length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  const insert = `import { Fonts } from '@/constants/theme';\n`;
  const firstImport = content.search(/^import /m);
  if (firstImport >= 0) {
    return content.slice(0, firstImport) + insert + content.slice(firstImport);
  }
  return insert + content;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  if (file.includes('constants/fonts.ts') || file.includes('constants/theme.ts')) continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const [re, rep] of REPLACEMENTS) {
    content = content.replace(re, rep);
  }
  if (content !== original) {
    content = ensureFontsImport(content, file);
    fs.writeFileSync(file, content);
    changed++;
    console.log('Updated:', path.relative(ROOT, file));
  }
}

console.log(`\nDone. ${changed} files updated.`);
