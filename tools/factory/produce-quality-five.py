#!/usr/bin/env python3
"""Reproduce draft atlases with the existing factory; never installs or approves them."""
import subprocess,sys,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
IDS=['solciju','brakk','veyra','morveth','aelith']
OUT=ROOT/'docs/production/quality-five'
OUT.mkdir(parents=True,exist_ok=True)
subprocess.run([sys.executable,'tools/art/painter/forge.py','check','quality_wine_cask','quality_fungal_cap','quality_hourglass'],cwd=ROOT,check=True)
rows=[]
for champion in IDS:
 for key in [champion,champion+'_alt1']:
  subprocess.run(['node','tools/factory/cli.js','paint',key],cwd=ROOT,check=True)
  atlas=ROOT/'tools/art/painter/out'/key/'atlas.png'
  rows.append({'id':key,'atlasSha256':hashlib.sha256(atlas.read_bytes()).hexdigest(),'numericStyle':'PASS','visualStatus':'PENDING_REVIEW','installed':False})
canvas=Image.new('RGB',(672,680),'#252334');draw=ImageDraw.Draw(canvas)
for row,k in enumerate(IDS):
 for variant,key in enumerate([k,k+'_alt1']):
  im=Image.open(ROOT/'tools/art/painter/out'/key/'atlas.png').convert('RGBA')
  for col in range(3):
   frame=im.crop((0,112*col,112,112*(col+1)));canvas.paste(frame,((variant*3+col)*112,row*136),frame)
  draw.text((variant*336+3,row*136+116),key,fill='white')
canvas.resize((1344,1360),Image.Resampling.NEAREST).save(OUT/'candidates.png')
(OUT/'manifest.json').write_text(json.dumps({'status':'DRAFT_NOT_PLAYABLE','candidates':rows},indent=2)+'\n')
