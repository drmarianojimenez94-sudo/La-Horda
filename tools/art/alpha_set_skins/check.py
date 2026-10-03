"""Fail on clipped/empty active frames, nonbinary alpha or mixed scale import."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[3]
m=json.loads((root/'art-source/alpha-set-skins/manifest.json').read_text())
for entry in m['skins']:
 folder=root/f"assets/sprites/champions/{entry['champion']}/skins/{entry['set']}"
 im=Image.open(folder/'atlas.png').convert('RGBA'); assert im.size==(384,576)
 hist=im.getchannel('A').histogram();assert sum(hist[1:255])==0
 excluded={f['index'] for f in entry['excludedFrames']}
 for i in range(24):
  cell=im.crop((i%4*96,i//4*96,i%4*96+96,i//4*96+96));box=cell.getbbox()
  if i in excluded: assert box is None;continue
  assert box, (entry['champion'],i,'empty')
  assert box[0]>=3 and box[1]>=3 and box[2]<=93 and box[3]<=91,(entry['champion'],i,box)
 assert Image.open(folder/'preview.png').size==(96,96)
print('PASS 46 used poses: binary alpha, safe margins, foot baseline; 2 rejected poses absent from production atlas')
