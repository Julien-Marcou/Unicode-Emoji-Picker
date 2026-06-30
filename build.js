import { build } from 'esbuild';
import { minify as minifyCSS } from 'csso';
import { minify as minifyHTML } from 'html-minifier-terser';
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const outputFilename = 'index.js';

const jsSource = readFileSync('src/index.js').toString();
const cssSource = readFileSync('src/index.css').toString();
const htmlSources = readdirSync('src/templates').map((filename) => {
  return [filename, readFileSync(`src/templates/${filename}`).toString()];
});

let jsReadyForBundle = jsSource;

// CSS minification
const minifiedCss = minifyCSS(cssSource, { restructure: false, }).css;
jsReadyForBundle = jsReadyForBundle.replace('{{index.css}}', minifiedCss);

// HTML minification
for (const [filename, htmlSource] of htmlSources) {
  const minifiedHtml = await minifyHTML(htmlSource, { collapseWhitespace: true });
  jsReadyForBundle = jsReadyForBundle.replace(`{{${filename}}}`, minifiedHtml);
}

// JS minification
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
