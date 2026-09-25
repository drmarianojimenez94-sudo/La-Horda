#!/usr/bin/env python3
"""Build an instrumented copy of a La Horda site tree for testing.
usage: build_test.py <src_dir> <out_dir>
- injects harness/pre.js inline as the very first thing in <head>
- injects harness/hooks_body.js: inside the main IIFE (monolithic build) or as a
  separate classic script right before </body> (modular build)
"""
import os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
pre = open(os.path.join(HERE, 'pre.js'), encoding='utf-8').read()
hooks = open(os.path.join(HERE, 'hooks.js'), encoding='utf-8').read()

if os.path.exists(out):
    shutil.rmtree(out)
os.makedirs(out)
for name in os.listdir(src):
    if name in ('.git', '.claude', 'node_modules', 'tools', 'docs'):
        continue
    p = os.path.join(src, name)
    if os.path.isdir(p):
        shutil.copytree(p, os.path.join(out, name))
    elif name == 'index.html' or not name.endswith('.md'):
        shutil.copy2(p, os.path.join(out, name))

html = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
m = re.search(r'<head[^>]*>', html)
assert m, 'no <head>'
html = html[:m.end()] + '\n<script>\n' + pre + '\n</script>\n' + html[m.end():]

anchor = 'setState("title");\nrequestAnimationFrame(loop);\n\n})();'
if html.count(anchor) == 1:
    # monolithic: hooks must live inside the IIFE to see its closure
    body = hooks.replace('"use strict";\n', '', 1)
    html = html.replace(anchor, 'setState("title");\nrequestAnimationFrame(loop);\n' + body + '\n})();')
    mode = 'monolith'
else:
    open(os.path.join(out, '__test_hooks.js'), 'w', encoding='utf-8').write(hooks)
    i = html.rindex('</body>')
    html = html[:i] + '<script src="__test_hooks.js"></script>\n' + html[i:]
    mode = 'modular'
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
print('built', out, 'mode', mode)
