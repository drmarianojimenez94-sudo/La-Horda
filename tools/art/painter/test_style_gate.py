#!/usr/bin/env python3
"""Negative controls: invalid atlases must never pass candidate admission."""
import tempfile, subprocess, sys
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    cases = [('empty', (448, 1008)), ('wrong_grid', (112, 112))]
    for name, size in cases:
        file = tmp / (name + '.png')
        Image.new('RGBA', size).save(file)
        result = subprocess.run([sys.executable, str(HERE/'style_gate.py'), str(file)], capture_output=True, text=True)
        assert result.returncode != 0 and 'FAIL ' in result.stdout, (name, result.stdout, result.stderr)
    file = tmp/'corrupt.png'; file.write_text('not a PNG')
    result = subprocess.run([sys.executable, str(HERE/'style_gate.py'), str(file)], capture_output=True, text=True)
    assert result.returncode != 0 and 'atlas ilegible' in result.stdout
    # Approved donor stays measurable; deleting even one walking frame must fail.
    donor = Image.open(ROOT/'assets/sprites/champions/sira/atlas.png').convert('RGBA')
    valid = tmp/'valid.png'; donor.save(valid)
    result = subprocess.run([sys.executable, str(HERE/'style_gate.py'), str(valid)], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    donor.paste((0,0,0,0), (0,0,112,112)); incomplete=tmp/'incomplete.png'; donor.save(incomplete)
    result = subprocess.run([sys.executable, str(HERE/'style_gate.py'), str(incomplete)], capture_output=True, text=True)
    assert result.returncode != 0 and 'faltan cuadros' in result.stdout
print('PASS style gate: empty, wrong grid, corrupt and missing frames rejected; reference accepted')
