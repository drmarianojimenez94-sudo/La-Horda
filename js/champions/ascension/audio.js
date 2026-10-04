'use strict';
// Acentos sintetizados propios (mezcla compartida: mute, prioridades y techo de voces de audio.js).
// Lanzamiento: 2 capas; definitiva: 3-4 capas; eventos de Fundador con envolvente propia.
const ASC_AUDIO={nano_gm:[440,220,'sine'],facu_gm:[196,294,'triangle'],aurelia:[784,1046,'sine'],khepri:[180,90,'triangle'],velmira:[523,392,'triangle'],vhal:[147,110,'sine'],bront:[98,73,'triangle'],oriel:[659,494,'sine'],saelis:[698,1047,'sine']};
for(const [k,[a,b,type]] of Object.entries(ASC_AUDIO)){
 ARENA_SFX['asc_'+k+'_cast']={p:2,gap:330,play(t,D){_tone(t,type,a,b,.16,.045,D);_tone(t+.06,'sine',b,b*1.5,.12,.022,D);return .2;}};
 ARENA_SFX['asc_'+k+'_ult']={p:3,gap:900,play(t,D){_tone(t,type,a*.5,a,.3,.05,D);_tone(t+.18,'sine',b,b*1.5,.35,.035,D);_tone(t+.36,'sine',a*1.5,a,.4,.028,D);_tone(t+.5,'triangle',a*.25,a*.25,.6,.03,D);return .9;}};
}
ARENA_SFX.asc_regent={p:3,gap:2000,play(t,D){_tone(t,'sine',330,660,.4,.04,D);_tone(t,'triangle',165,82,.6,.04,D);_tone(t+.25,'sine',990,880,.5,.02,D);return .8;}};
ARENA_SFX.asc_judgement={p:3,gap:3000,play(t,D){_tone(t,'triangle',55,41,1.2,.06,D);_tone(t+.1,'sine',880,1320,.6,.03,D);_tone(t+.3,'sine',220,440,.9,.04,D);return 1.3;}};
ARENA_SFX.asc_hightide={p:3,gap:2000,play(t,D){_tone(t,'sine',196,392,.5,.035,D);_tone(t+.2,'sine',587,784,.4,.025,D);return .7;}};
ARENA_SFX.asc_wave={p:3,gap:2000,play(t,D){_tone(t,'triangle',73,49,1.0,.06,D);_tone(t+.05,'sine',392,196,.8,.03,D);return 1.1;}};
ARENA_SFX.asc_collapse={p:3,gap:2000,play(t,D){_tone(t,'sine',880,55,.9,.05,D);_tone(t+.2,'triangle',41,41,.8,.05,D);return 1.0;}};
ARENA_SFX.asc_feather={p:1,gap:120,play(t,D){_tone(t,'sine',1568,2093,.08,.018,D);return .1;}};
