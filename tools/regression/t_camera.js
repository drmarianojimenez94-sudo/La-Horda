// Cámara / resolución: protege contra el bug de "cámara demasiado cerca" y la imagen deformada
// en iPhone. Recorre varias pantallas (iPhone horizontal/vertical con DPR 3, iPhone SE, iPad,
// escritorio, ultraancha y el zoom de página de Safari) y, en cada una, verifica:
//   1. el buffer del canvas tiene la MISMA proporción que su caja en pantalla (sin estirar);
//   2. resolución interna = caja × min(devicePixelRatio, 2);
//   3. el mundo visible en el lado corto es siempre VIEW_WORLD_SHORT (650) unidades (o el tope
//      del lado largo en pantallas muy anchas): la escala visual no depende de la resolución;
//   4. el jugador ocupa la misma fracción de la pantalla en todas;
//   5. el suavizado está apagado (pixel art nítido) después de dibujar;
//   6. al rotar/redimensionar se reajusta, y si el navegador NO avisa (caso iOS), el chequeo por
//      cuadro lo corrige solo.
// usage: node t_camera.js <site> <outdir>     (site = carpeta servida en REGRESSION_BASE_URL)
const { launch, BASE, sleep, seedSave, writeJSON } = require('./lib.js');
const site = process.argv[2] || 'despues', out = process.argv[3] || '/tmp/t_camera';
const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 220) : '')); }

const VIEWPORTS = [
  { name: 'iphone_landscape', w: 844, h: 390, dpr: 3, mobile: true },
  { name: 'iphone_portrait', w: 390, h: 844, dpr: 3, mobile: true },
  { name: 'iphone_se', w: 667, h: 375, dpr: 2, mobile: true },
  { name: 'safari_page_zoom_115', w: 734, h: 339, dpr: 3.45, mobile: true },
  { name: 'ipad', w: 1024, h: 768, dpr: 2, mobile: true },
  { name: 'desktop', w: 1280, h: 720, dpr: 1, mobile: false },
  { name: 'ultrawide', w: 2560, h: 1080, dpr: 1, mobile: false },
];
const probe = () => {
  render(); // un cuadro dibujado con el estado actual
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return {
    box: [r.width, r.height], buf: [canvas.width, canvas.height], dpr, VW, VH, DPR, zoom: CAM_ZOOM,
    worldShort: Math.min(VW, VH) / CAM_ZOOM, worldLong: Math.max(VW, VH) / CAM_ZOOM,
    heroFrac: (player.radius * 2 * CAM_ZOOM) / Math.min(VW, VH),
    smoothing: ctx.imageSmoothingEnabled,
    tf: (() => { const m = ctx.getTransform(); return [m.a, m.d]; })(),
  };
};
function verify(tag, p, refFrac) {
  const aBox = p.box[0] / p.box[1], aBuf = p.buf[0] / p.buf[1];
  check(`${tag}.aspect_preserved`, Math.abs(aBox - aBuf) / aBox < 0.005, { aBox: +aBox.toFixed(4), aBuf: +aBuf.toFixed(4) });
  check(`${tag}.buffer_is_box_x_dpr`, Math.abs(p.buf[0] - Math.round(p.box[0] * p.dpr)) <= 1 && Math.abs(p.buf[1] - Math.round(p.box[1] * p.dpr)) <= 1, { box: p.box, buf: p.buf, dpr: p.dpr });
  check(`${tag}.transform_matches_buffer`, Math.abs(p.tf[0] - p.buf[0] / p.VW) < 1e-6 && Math.abs(p.tf[1] - p.buf[1] / p.VH) < 1e-6, { tf: p.tf });
  const capped = p.worldLong > 1500.5;
  check(`${tag}.world_view_consistent`, !capped && (Math.abs(p.worldShort - 650) < 0.5 || (p.worldShort < 650 && Math.abs(p.worldLong - 1500) < 0.5)), { worldShort: +p.worldShort.toFixed(1), worldLong: +p.worldLong.toFixed(1), zoom: +p.zoom.toFixed(3) });
  if (refFrac && Math.abs(p.worldShort - 650) < 0.5) check(`${tag}.hero_same_screen_fraction`, Math.abs(p.heroFrac - refFrac) / refFrac < 0.01, { frac: +p.heroFrac.toFixed(4), ref: +refFrac.toFixed(4) });
  check(`${tag}.no_smoothing`, p.smoothing === false, p.smoothing);
}

(async () => {
  const browser = await launch();
  let refFrac = null;
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, isMobile: v.mobile, hasTouch: v.mobile });
    await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('laHordaSave_v1', s); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} }, JSON.stringify(seedSave()));
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${BASE}/${site}/index.html`, { waitUntil: 'load', timeout: 120000 });
    await page.evaluate(() => { selectedClass = 'guerrero'; currentArena = 'bosque'; startRun(1); });
    await sleep(400);
    const p = await page.evaluate(probe);
    if (!refFrac) refFrac = p.heroFrac;
    verify(v.name, p, refFrac);
    // recarga: misma escala
    if (v.name === 'iphone_landscape') {
      await page.reload({ waitUntil: 'load' });
      await page.evaluate(() => { selectedClass = 'guerrero'; currentArena = 'bosque'; startRun(1); });
      await sleep(300);
      verify(v.name + '.after_reload', await page.evaluate(probe), refFrac);
      // rotar a vertical y volver
      await page.setViewportSize({ width: v.h, height: v.w }); await sleep(350);
      verify(v.name + '.rotated_portrait', await page.evaluate(probe), refFrac);
      await page.setViewportSize({ width: v.w, height: v.h }); await sleep(350);
      verify(v.name + '.rotated_back', await page.evaluate(probe), refFrac);
      // iOS que no avisa: se falsea un tamaño viejo y se espera que el chequeo por cuadro lo corrija
      await page.evaluate(() => { try { VW = 500; VH = 700; CAM_ZOOM = 2.5; } catch (e) { VW = 500; VH = 700; } });
      await sleep(200);
      verify(v.name + '.stale_size_self_heals', await page.evaluate(probe), refFrac);
    }
    check(`${v.name}.no_errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
  const pass = checks.filter(c => c.ok).length, fail = checks.length - pass;
  console.log('SUMMARY', JSON.stringify({ pass, fail }));
  writeJSON(out + '/camera.json', checks);
  process.exit(fail ? 1 : 0);
})();
