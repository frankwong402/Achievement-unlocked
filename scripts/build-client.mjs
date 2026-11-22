// Bundle only the public quest controller. One HTML response can paint and start
// the board even when the venue network delays secondary Next.js chunks.
import {build} from 'esbuild';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

const {outputFiles} = await build({
  stdin: {
    contents: "import {mountAchievementApp} from './src/features/achievements/lib/controller.js'; mountAchievementApp();",
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false
});
const javascript = outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile('src/app/globals.css','utf8');
await mkdir('src/generated',{recursive:true});
await writeFile('src/generated/quest-shell.js',
  'export const javascript = '+JSON.stringify(javascript)+';\nexport const css = '+JSON.stringify(css)+';\n');
