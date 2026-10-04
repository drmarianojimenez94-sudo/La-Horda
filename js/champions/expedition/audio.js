'use strict';
// Original synthesized accents. Shared mixer enforces mute, priorities and voice ceilings.
// Two layers per cast, three per ultimate; family gap prevents repeated horde ticks sounding.
const EX_AUDIO={vesper:[740,370,'triangle'],nahir:[880,660,'sine'],baltra:[196,98,'sine'],maura:[294,147,'triangle'],dariel:[440,554,'sine'],orsa:[620,155,'triangle'],tibor:[165,185,'triangle'],zahra:[110,55,'triangle'],renko:[130,65,'sine'],sira:[523,784,'sine']};
for(const [k,[a,b,type]] of Object.entries(EX_AUDIO)){
 ARENA_SFX['ex_'+k+'_cast']={p:2,gap:350,play(t,D){_tone(t,type,a,b,.16,.045,D);_tone(t+.065,'sine',b,b,.12,.025,D);return .2;}};
 ARENA_SFX['ex_'+k+'_ult']={p:3,gap:900,play(t,D){_tone(t,type,a*.5,a,.25,.045,D);_tone(t+.16,'sine',b,b*1.5,.28,.035,D);_tone(t+.32,'sine',a*1.5,a,.3,.025,D);return .65;}};
}
