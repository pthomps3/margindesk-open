import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

// Keep lazy loading on the hosted site. The file copy bundles Excel with the
// rest of the app because browsers restrict module requests from file URLs.
const { output } = await build({
  build: {
    write: false,
    copyPublicDir: false,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: () => true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});

const script = output.find(file => file.type === 'chunk');
const css = output.find(file => file.type === 'asset' && file.fileName.endsWith('.css'));
if (!script || !css || output.length !== 2 || script.imports.length || script.dynamicImports.length) {
  throw new Error('The offline build must contain exactly one script and one stylesheet.');
}

const dom = new JSDOM(await readFile('index.html', 'utf8'));
const document = dom.window.document;
const icon = document.querySelector('#tab-icon');
for (const theme of ['light', 'dark']) {
  const svg = await readFile('public/favicon-' + theme + '.svg');
  icon.dataset[theme] = 'data:image/svg+xml;base64,' + svg.toString('base64');
}
icon.href = icon.dataset.light;

function embedScript(element, code) {
  element.removeAttribute('src');
  element.removeAttribute('type');
  element.textContent = code.replace(/<\/script/gi, '<\\/script');
}
embedScript(document.querySelector('script[src="./appearance.js"]'), await readFile('public/appearance.js', 'utf8'));
embedScript(document.querySelector('script[type="module"]'), script.code);
const style = document.createElement('style');
style.textContent = css.source;
document.head.append(style);

// Distribute the notices from every dependency Rollup included in this file.
const packagePaths = new Set();
for (const id of Object.keys(script.modules)) {
  const normalized = id.replace(/^\0/, '').replaceAll('\\', '/');
  const match = normalized.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)/);
  if (match) packagePaths.add(match[1]);
}
const notices = [await readFile('LICENSE', 'utf8')];
for (const dir of [...packagePaths].sort()) {
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile() && /^(licen[cs]e|copying|notice)([.-]|$)/i.test(entry.name));
  if (!files.length) throw new Error('Missing distribution notice for ' + pkg.name);
  notices.push(pkg.name + ' ' + pkg.version);
  for (const file of files) notices.push(await readFile(join(dir, file.name), 'utf8'));
}
const license = document.createElement('script');
license.type = 'text/plain';
license.id = 'open-source-licenses';
license.textContent = notices.join('\n\n').replace(/<\/script/gi, '<\\/script');
document.body.append(license);

const archive = zipSync({ 'MarginDesk.html': strToU8(dom.serialize()) });
await writeFile('dist/margindesk-offline.zip', archive);
console.log('Created dist/margindesk-offline.zip (' + Math.ceil(archive.length / 1024) + ' KiB).');
