
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

const output = jsSource.replace(cssToken, cssSource).replace(htmlToken, htmlSource);
writeFileSync(outputFilename, output);
