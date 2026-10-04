"""Import commissioned sprites: crop transparent gutters, binary alpha, uniform scale.
No drawing, recoloring or invented poses. Follows the existing art importer pipeline.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np, json, hashlib
from scipy.ndimage import label
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'art-source/expedition'
if not list(SRC.glob('*.png')):raise SystemExit('Provide commissioned source sheets in art-source/expedition before reimporting; reviewed runtime atlases are already versioned.')
report={}; metas={}
for src in sorted(SRC.glob('*.png')):
 key=src.stem
 rows=8 if key in ('vesper_skin','nahir_set','orsa_skin','orsa_set') else 9
 im=Image.open(src).convert('RGBA'); arr=np.array(im); mask=arr[:,:,3]>=160
 ys=[0]
 for n in range(1,rows):
  expected=round(im.height*n/rows); lo=max(ys[-1]+1,expected-35);hi=min(im.height,expected+36)
  sums=mask[lo:hi].sum(axis=1);minimum=sums.min();choices=np.where(sums==minimum)[0]+lo
  ys.append(int(min(choices,key=lambda y:abs(y-expected))))
 ys.append(im.height);cells=[];boxes=[]
 for row in range(rows):
  for col in range(4):
   x0=round(im.width*col/4);x1=round(im.width*(col+1)/4)
   cell=im.crop((x0,ys[row],x1,ys[row+1]));a=np.array(cell);m=a[:,:,3]>=160
   labs,n=label(m);sizes=np.bincount(labs.ravel());sizes[0]=0
   if not n or sizes.max()<300:raise ValueError((key,row,col,'missing body'))
   # Main connected silhouette only; detached decorative VFX belongs in engine layer.
   keep=labs==sizes.argmax()
   # A detached dropped weapon on the death row remains part of the authored pose.
   if row==rows-1:
    for j in range(1,n+1):
     if sizes[j]>100:keep|=labs==j
   a[:,:,3]=np.where(keep,255,0);cell=Image.fromarray(a);box=cell.getbbox()
   if box is None:raise ValueError((key,row,col,'empty'))
   cells.append(cell.crop(box));boxes.append(list(box))
 # One scale per entire animation, not one per frame: prevents breathing/weapon jitter.
 scale=min(72/cells[0].height,100/max(c.width for c in cells),98/max(c.height for c in cells))
 supp=SRC/'supplemental'/(key+'_back.png')
 if supp.exists():
  extra=Image.open(supp).convert('RGBA');ecells=[]
  for er in range(2):
   for col in range(2):
    c=extra.crop((col*extra.width//2,er*extra.height//2,(col+1)*extra.width//2,(er+1)*extra.height//2));a=np.array(c);m=a[:,:,3]>=160;labs,n=label(m);sizes=np.bincount(labs.ravel());sizes[0]=0;a[:,:,3]=np.where(labs==sizes.argmax(),255,0);c=Image.fromarray(a);ecells.append(c.crop(c.getbbox()))
  # Scale supplementary body to the authored back-walk recovery, then retain relative pose sizes.
  factor=cells[8].height/ecells[-1].height
  cells += [c.resize((round(c.width*factor),round(c.height*factor)),Image.Resampling.NEAREST) for c in ecells]
 scale=min(scale,100/max(c.width for c in cells),98/max(c.height for c in cells))
 atlas=Image.new('RGBA',(448,112*((len(cells)+3)//4)));bounds=[]
 for i,cell in enumerate(cells):
  cell=cell.resize((max(1,round(cell.width*scale)),max(1,round(cell.height*scale))),Image.Resampling.NEAREST)
  atlas.alpha_composite(cell,((i%4)*112+(112-cell.width)//2,(i//4)*112+106-cell.height));bounds.append([cell.width,cell.height])
 champ=key.split('_')[0];variant=key[len(champ):].lstrip('_')
 folder=ROOT/f'assets/sprites/champions/{champ}'
 if variant:folder/=f'skins/{key}'
 folder.mkdir(parents=True,exist_ok=True);atlas.save(folder/'atlas.png',optimize=True);atlas.crop((0,0,112,112)).save(folder/'preview.png',optimize=True)
 sets={}
 for direction,offset,attack in [('down',0,12),('side',4,16),('up',8,20)]:
  for state,frames in [('idle',[offset]),('walk',list(range(offset,offset+4))),('attack',list(range(attack,attack+4))),('cast',[24,25,26,27]),('ultimate',[28,29,30,31]),('hit',[attack]),('death',[32,33,34,35])]:sets[state+'_'+direction]=frames
 # Reject incorrect facing poses without making up replacements: loop other authored steps.
 if key=='nahir':sets['walk_down']=[0,1,0,3];sets['walk_side']=[4,5,4,7]
 if key in ('baltra','baltra_skin','baltra_set'):sets['attack_side']=[16,17,18,16]
 if rows==8:
  for direction in ('down','side','up'):
   sets['death_'+direction]=[28,29,30,31]
   sets['cast_'+direction]=[24,25,26,27] if key=='vesper_skin' else [20,21,22,23]
   sets['ultimate_'+direction]=[24,25,26,27]
 if supp.exists():sets['attack_up']=list(range(rows*4,rows*4+4));sets['hit_up']=[rows*4]
 if key=='vesper_skin':sets['attack_down']=[12,13,12,13];sets['attack_side']=[16,17,18,16]
 meta={'w':112,'h':112,'cols':4,'refH':bounds[0][1],'anchor':106/112,'fix':{'left':'mirror'},'sets':sets}
 rel=str(folder.relative_to(ROOT));metas[key]={'champ':champ,'variant':variant,'src':rel+'/atlas.png','preview':rel+'/preview.png','meta':meta}
 report[key]={'source':str(src.relative_to(ROOT)),'authoredPoses':len(cells),'retainedPoses':len(cells),'bounds':bounds,'scale':scale,'sourceBoxes':boxes,'alphaBinary':set(atlas.getchannel('A').get_flattened_data())<={0,255},'sha256':hashlib.sha256((folder/'atlas.png').read_bytes()).hexdigest(),'directionNotes':'Left mirrored. Cast, ultimate and death use authored front sequence explicitly for all facings.'}
(ROOT/'docs/expedition/art-import-results.json').write_text(json.dumps(report,indent=2))
(ROOT/'js/champions/expedition/art-data.json').write_text(json.dumps(metas,separators=(',',':')))
# Contact sheet is evidence, never a runtime atlas.
thumb=Image.new('RGB',(560,((len(metas)+4)//5)*150),'#171b24');d=ImageDraw.Draw(thumb)
for i,(key,v) in enumerate(metas.items()):
 p=Image.open(ROOT/v['preview']);x=(i%5)*112;y=(i//5)*150;thumb.paste(p,(x,y),p);d.text((x+3,y+115),key,fill='white')
thumb.save(ROOT/'docs/expedition/roster-contact.png')
print('Imported',len(metas),'sheets;',len(metas)*36,'authored poses. Technical normalization complete; visual review still required.')
