import { build } from 'esbuild';
import { minify as minifyCSS } from 'csso';
import { minify as minifyHTML } from 'html-minifier-terser';
import { readFileSync, writeFileSync } from 'fs';

const cssInputFilename = 'src/index.css';
const htmlInputFilename = 'src/index.html';
const jsInputFilename = 'src/index.js';
const outputFilename = 'index.js';
const cssToken = '{{COMPONENT_CSS}}';
const htmlToken = '{{COMPONENT_HTML}}';

const cssSource = readFileSync(cssInputFilename).toString();
const htmlSource = readFileSync(htmlInputFilename).toString();
const jsSource = readFileSync(jsInputFilename).toString();

const minifiedCSS = minifyCSS(
  cssSource,
  {
    restructure: false,
  },
).css;
const minifiedHTML = await minifyHTML(
  htmlSource,
  {
    collapseWhitespace: true,
  },
);

const jsReadyForBundle = jsSource.replace(cssToken, minifiedCSS).replace(htmlToken, minifiedHTML);

const bundledJs = await build({
  stdin: {
    contents: jsReadyForBundle,
    resolveDir: './src',
  },
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  bundle: true,
  minify: true,
  write: false,
  outdir: './dist',
  external: [
    'unicode-emoji',
    'scrollable-component',
  ],
});

writeFileSync(outputFilename, bundledJs.outputFiles[0].text);
