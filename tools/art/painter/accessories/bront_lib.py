"""Reexporta la librería de dibujo compartida (tools/art/painter/forge.py). Se conserva el nombre para los
accesorios existentes; los nuevos importan forge directamente."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from forge import (CELL, COLS, hexrgb, _lab, _rgb, ramp_colors, cell_view, shade, paste, ellipse_mask, poly_mask,  # noqa: F401
                   lab_of, outline_fix, drop_specks)
