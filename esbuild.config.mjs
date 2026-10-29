import esbuild from 'esbuild';
import { builtinModules } from 'node:module';
const watch = process.argv.includes('--watch');
const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'], bundle: true, outfile: 'main.js', format: 'cjs', target: 'es2020', platform: 'node',
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*', ...builtinModules, ...builtinModules.map(m => 'node:' + m)],
  sourcemap: false, minify: !watch, logLevel: 'info'
});
if (watch) await ctx.watch(); else { await ctx.rebuild(); await ctx.dispose(); }
