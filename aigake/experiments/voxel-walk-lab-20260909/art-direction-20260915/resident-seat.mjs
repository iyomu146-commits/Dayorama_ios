import {turn} from './town-plan.mjs';

// Use the authored furniture's floor, seat top and facing direction. Advance
// the hips enough to put the shins beyond the seat's front edge.
export function residentSeat(building,furniture,appearance={}){
 if(!furniture?.center||!['bench','chair'].includes(furniture.name))return null;
 const b=building,f=furniture,u=b.u,size=appearance.age==='child'?.72:1;
 const front=(f.name==='chair'?2.5:1.5)*u,shin=(appearance.boots?.046:.035)*size;
 const forward=Math.max(.5*u,front-.215*size+shin+.012),[dx,dz]=turn(0,forward,-f.turn);
 const [x,z]=turn(f.center[0]*u+dx,f.center[2]*u+dz,b.rot);
 const floor=b.y+(Math.min(...f.feet.map(p=>p[1]))-.5)*u,top=b.y+f.center[1]*u;
 return{position:[b.x+x,floor,b.z+z],yaw:(b.rot-f.turn)*Math.PI/2,height:top-floor};
}
