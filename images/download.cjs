const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const source = 'https://salon.nika-nagel.com/';
const imagePattern = /\.(?:jpe?g|png|webp|svg|gif|ico|avif)(?:\?|$)/i;
const extract = text => [...text.matchAll(/https?:[^\s"'<>\\)]+/g)].map(m => m[0].replace(/&amp;/g, '&'));
function original(url) {
  const u = new URL(url);
  if (/(?:^|\.)tildacdn\.com$/.test(u.hostname)) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (/^tild[\w-]+$/.test(parts[0])) {
      u.hostname = 'static.tildacdn.com';
      u.pathname = '/' + parts[0] + '/' + parts.at(-1);
      u.search = '';
    }
  }
  return u.href;
}
async function get(url) {
  const r = await fetch(url, {signal: AbortSignal.timeout(45000)});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}
async function main() {
  const html = fs.readFileSync(path.join(root, 'source.html'), 'utf8');
  const partnerMarker = html.indexOf('Наши Партнеры');
  const partnerStart = html.lastIndexOf('<div id="rec', partnerMarker);
  const partnerEnd = html.indexOf('<div id="rec', partnerMarker);
  const partnerBlock = html.slice(partnerStart, partnerEnd < 0 ? undefined : partnerEnd);
  const partnerUrls = new Set(extract(partnerBlock).filter(u => imagePattern.test(u)).map(original));
  const urls = new Set(extract(html).filter(u => imagePattern.test(u)).map(original));
  const styles = [...new Set(extract(html).filter(u => /\.css(?:\?|$)/i.test(u)))];
  const styleResults = await Promise.allSettled(styles.map(async u => {
    const css = await (await get(u)).text();
    for (const image of extract(css).filter(u => imagePattern.test(u))) urls.add(original(image));
  }));
  const files = [], errors = [], hashes = new Map();
  const queue = [...urls];
  fs.mkdirSync(path.join(root, 'partners'), {recursive:true});
  await Promise.all(Array.from({length:6}, async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const r = await get(url);
        const type = r.headers.get('content-type') || '';
        if (!type.startsWith('image/')) throw new Error(`Unexpected content type: ${type}`);
        const data = Buffer.from(await r.arrayBuffer());
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        let file = hashes.get(hash);
        if (!file) {
          const name = decodeURIComponent(new URL(url).pathname.split('/').at(-1)).replace(/[^a-zA-Z0-9._-]/g, '_');
          file = `${partnerUrls.has(url) ? 'partners/' : ''}${hash.slice(0,10)}-${name}`;
          hashes.set(hash, file);
          fs.writeFileSync(path.join(root, file), data);
        }
        files.push({file, url, bytes:data.length, contentType:type, sha256:hash});
      } catch(e) { errors.push({url,error:e.message}); }
    }
  }));
  files.sort((a,b) => a.file.localeCompare(b.file));
  const manifest = {source, downloadedAt:new Date().toISOString(), uniqueFiles:hashes.size, files, errors, stylesheetErrors:styleResults.flatMap((r,i) => r.status==='rejected' ? [{url:styles[i],error:r.reason.message}] : [])};
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique = [...new Map(files.map(f=>[f.file,f])).values()];
  fs.writeFileSync(path.join(root,'index.html'), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Изображения NIKA NAGEL</title><style>body{font:16px system-ui;margin:32px;background:#fafafa;color:#262626}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px}figure{margin:0;padding:12px;background:white;border:1px solid #ddd}img{width:100%;height:220px;object-fit:contain}figcaption{overflow-wrap:anywhere;font-size:13px}a{color:#262626}</style><h1>Изображения с текущего сайта NIKA NAGEL</h1><p>Источник: <a href="${source}">${source}</a>. Скачано уникальных файлов: ${unique.length}.</p><main>${unique.map(f=>`<figure><a href="${escape(f.file)}"><img loading="lazy" src="${escape(f.file)}" alt="${escape(path.basename(f.file))}"></a><figcaption>${escape(path.basename(f.file))}<br><a href="${escape(f.url)}">Источник</a></figcaption></figure>`).join('')}</main></html>`);
  fs.writeFileSync(path.join(root,'README.md'), `# Изображения с текущего сайта NIKA NAGEL\n\nИсточник: ${source}\n\nСкачано ${unique.length} уникальных файлов. Оригинальные изображения Tilda сохранены без уменьшения; одинаковые файлы объединены по SHA-256. В набор входят фотографии, логотипы, иконки и декоративные изображения, указанные в HTML и подключённых CSS главной страницы.\n\n- Файлы изображений находятся в этой папке.\n- partners/ — логотипы партнёров.\n- index.html — галерея для просмотра в браузере.\n- manifest.json — исходные URL, размеры файлов, контрольные суммы и ошибки загрузки.\n- source.html — исходный HTML страницы на момент скачивания.\n- download.cjs — скрипт повторной загрузки (Node.js 22+).\n\nНе удалось скачать: ${errors.length}. Ошибки чтения CSS: ${manifest.stylesheetErrors.length}.\n`);
  console.log(JSON.stringify({uniqueFiles:hashes.size,totalBytes:unique.reduce((n,f)=>n+f.bytes,0),errors,stylesheetErrors:manifest.stylesheetErrors},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
