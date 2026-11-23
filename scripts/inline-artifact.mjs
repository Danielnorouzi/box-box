// Inlines the artifact build (dist-artifact) into one HTML file for preview hosting.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = 'dist-artifact/assets';
const files = readdirSync(dir);
const css = files.filter(f => f.endsWith('.css')).map(f => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
const js = files.filter(f => f.endsWith('.js')).map(f => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
const icon = 'data:image/svg+xml;base64,' + readFileSync('public/favicon.svg').toString('base64');
const out = `<meta charset="utf-8">
<title>Pit Wall</title>
<meta name="theme-color" content="#0d0f12">
<link rel="icon" href="${icon}">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>
`;
writeFileSync(process.argv[2] ?? 'dist-artifact/pit-wall.html', out);
console.log('bytes', out.length);
