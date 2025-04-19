import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/app.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2021',
  sourcemap: true,
  minify: false,
  loader: {
    '.ts': 'ts',
  },
});

console.log('Build complete! ✨');
