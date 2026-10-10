// Diagnostic only: never writes the gate's approval report or changes its roster.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const run = require('./run-entry-simulation');
const key = process.argv[2] || 'saelis';
const output = 'docs/production/quality-five/entry-diagnostic.json';
const report = { status: 'RUNNING', diagnosticOnly: true, key, runs: [], errors: [] };
function save() { fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
(async () => {
  let browser, server;
  save();
  try {
    server = process.env.ENTRY_BASE_URL ? null : spawn('python3', ['-m', 'http.server', '8797'], { stdio: 'ignore' });
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    for (const mode of ['production', 'modules-only', 'workshop']) {
      for (let repeat = 0; repeat < 2; repeat++) for (const seed of [117, 431, 991]) {
        // Every sample starts with an empty browser context: no previous champion,
        // audio cache, local save, or queued animation can leak between samples.
        const context = await browser.newContext();
        try {
          const page = await context.newPage();
          page.on('pageerror', e => report.errors.push({ mode, repeat, seed, error: e.message }));
          await page.goto(process.env.ENTRY_BASE_URL || 'http://127.0.0.1:8797');
          await page.waitForFunction(() => typeof CHAMPION_ENTRY_BALANCE !== 'undefined');
          if (mode !== 'production') {
            await page.addScriptTag({ path: 'js/champions/quality-five/solciju.js' });
            await page.addScriptTag({ path: 'js/champions/quality-five/veyra.js' });
          }
          if (mode === 'workshop') {
            await page.addScriptTag({ path: 'tools/quality-five/register-fixture.js' });
            await page.addScriptTag({ path: 'tools/quality-five/register-veyra-fixture.js' });
          }
          const exists = await page.evaluate(k => !!CLASSES[k], key);
          if (!exists) throw new Error(`Unknown champion: ${key}`);
          await page.addScriptTag({ path: 'tools/balance/autopilot.js' });
          const result = { mode, repeat, ...await run(page, key, seed) };
          report.runs.push(result);
          save();
          console.log(JSON.stringify(result));
        } finally { await context.close(); }
      }
    }
    if (report.errors.length || report.runs.some(r => r.error || !Number.isFinite(r.damage))) throw new Error('Simulation errors');
    report.status = 'COMPLETE'; // Completion is deliberately not balance approval.
  } catch (e) { report.status = 'FAIL'; report.failure = String(e); process.exitCode = 1; }
  finally { save(); if (browser) await browser.close(); if (server) server.kill(); }
})();
