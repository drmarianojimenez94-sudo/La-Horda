#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const {ROOT, GATES, validate, scaffold} = require('./contracts');
const [command, arg, output] = process.argv.slice(2);
try {
  if (command === 'new') {
    if (!/^[a-z][a-z0-9_]*$/.test(arg || '') || !output) throw Error('new requires id and output.json');
    const category = (process.argv.find(x => x.startsWith('--category=')) || '--category=STANDARD').split('=')[1];
    fs.writeFileSync(output, JSON.stringify(scaffold(arg, category), null, 2) + '\n', {flag:'wx'});
    console.log('Draft created; not registered or approved. Complete manifest before validation.');
  } else if (command === 'duplicity') {
    const r = spawnSync('node', ['tools/factory/duplicity.js', ...(arg ? [arg] : [])], {cwd:ROOT, stdio:'inherit', timeout:600000});
    process.exitCode = r.status || 0;
  } else if (command === 'validate') {
    const errors = validate(JSON.parse(fs.readFileSync(arg, 'utf8')));
    console.log(JSON.stringify({status:errors.length ? 'INCOMPLETE' : 'STRUCTURAL_PASS', errors, note:'STRUCTURAL_PASS is not visual, gameplay or release approval.'}, null, 2));
    if (errors.length) process.exitCode = 1;
  } else if (command === 'gate') {
    const names = arg === 'all' ? Object.keys(GATES) : [arg];
    if (names.some(n => !GATES[n])) throw Error('Unknown gate. Use: ' + Object.keys(GATES).join(', ') + ', all');
    for (const name of names) {
      const [bin, ...args] = GATES[name];
      console.log(`Running ${name}: ${bin} ${args.join(' ')}`);
      const result = spawnSync(bin, args, {cwd:ROOT,stdio:'inherit',timeout:600000});
      if (result.error || result.status !== 0) { process.exitCode = 1; console.error(`${name}: FAIL (${result.error?.message || result.status})`); break; }
    }
  } else throw Error('Usage: node tools/factory/cli.js new <id> <output.json> [--category=STANDARD|FAMILY|FOUNDER|EVENT|DEV|TESTER] | duplicity [ids] | validate <manifest.json> | gate <name|all>');
} catch (e) { console.error(e.message); process.exitCode = 1; }
