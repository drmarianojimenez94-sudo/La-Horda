// Load-time snapshot: every top-level binding of the game (serialized, functions by source hash,
// images/canvases by decoded pixel hash) + vendor modules + image load state. Game is frozen
// on the title screen (deterministic mode, no frame has run).
// usage: node t_snapshot.js <site> <outdir>
const { launch, openDet, seedSave, writeJSON } = require('./lib.js');
const names = require('./names.json');
(async () => {
  const [site, outdir] = process.argv.slice(2);
  const browser = await launch();
  const { page, errors } = await openDet(browser, site, { save: seedSave() });
  const snap = await page.evaluate(n => window.__T.snapshot(n), names);
  const vendor = await page.evaluate(() => window.__T.vendorSnapshot());
  const img = await page.evaluate(() => window.__imgState());
  const errs = await page.evaluate(() => window.__errors.slice());
  const dom = await page.evaluate(() => {
    const h = window.__T.strHash;
    const b = document.body.cloneNode(true);
    b.querySelectorAll('script').forEach(s => s.remove());
    const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); const ws = []; while (tw.nextNode()) if (!tw.currentNode.nodeValue.trim()) ws.push(tw.currentNode); ws.forEach(n => n.remove());
    return { bodyHash: h(b.innerHTML), bodyLen: b.innerHTML.length, title: document.title,
      styleSheets: Array.from(document.styleSheets).map(s => { try { return Array.from(s.cssRules).map(r => r.cssText).join('\n').length; } catch (e) { return 'x'; } }),
      cssHash: h(Array.from(document.styleSheets).map(s => { try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n')) };
  });
  writeJSON(`${outdir}/snapshot.json`, { snap, vendor, img, errs, pageErrors: errors, dom });
  console.log('snapshot', site, 'bindings', Object.keys(snap).length, 'images', JSON.stringify(img).slice(0, 200), 'errors', errs.length + errors.length, 'dom', JSON.stringify(dom));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
