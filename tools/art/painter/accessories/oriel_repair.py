"""Oriel — misma reparación de cuadros que velmira_repair (ver ese módulo para las opciones)."""
import importlib.util
from pathlib import Path

_p = Path(__file__).resolve().parent / 'velmira_repair.py'
_s = importlib.util.spec_from_file_location('velmira_repair_shared', _p)
_m = importlib.util.module_from_spec(_s)
_s.loader.exec_module(_m)
draw = _m.draw
