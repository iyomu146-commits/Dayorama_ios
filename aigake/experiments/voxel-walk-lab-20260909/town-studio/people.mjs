import {humanStyle} from '../life/human-style.mjs';
import {propModel,rotate} from './props.mjs';
import {occupancy,inside,water,key} from './model.mjs';
export const PERSON_ROLES={baker:'パン屋の店員',cafe:'喫茶店の店員',gardener:'庭の手入れ',resident:'買い物帰り',visitor:'散歩',child:'子供',reader:'読書'};
export function staffProfile(b,index,region){
 const role=b.kind==='bakery'?'baker':b.kind==='cafe'?'cafe':index%3===0?'resident':'gardener';
 const appearance=humanStyle({region,role,variant:index,gender:index===0||index===3?'man':'woman'});
 return{appearance,item:{baker:'basket',cafe:'cup',gardener:'can',resident:'basket'}[role],action:role==='gardener'?'water':role==='resident'?'work':'serve'};
}
export function visitorProfiles(region){return[
 {appearance:humanStyle({region,role:'visitor',variant:0,gender:'woman'}),item:null,position:[-4,0]},
 {appearance:humanStyle({region,role:'visitor',variant:1,gender:'man'}),item:'book',position:[0,5]},
 {appearance:humanStyle({region,role:'child',variant:1,gender:'woman',age:'child'}),item:null,position:[0,-5]},
];}
export function readerProfile(region){return humanStyle({region,role:'reader',variant:2,gender:'woman'});}
export function seatPlacement(prop,appearance={},unit=.085){
 const seat=propModel(prop.kind).seat;if(!seat)return null;
 const scale=appearance.age==='child'?.72:1,shinRadius=(appearance.boots?.046:.035)*scale;
 // Put the knees, including their thickness, beyond the front of the seat.
 const forward=Math.max(.5*unit,seat.front*unit-.215*scale+shinRadius+.012);
 const [x,z]=rotate(seat.x,seat.z+forward/unit,prop.r);
 return{position:[prop.x+x,prop.z+z],yaw:-prop.r*Math.PI/2,seatHeight:seat.y*unit,seatId:prop.id};
}
export function canSit(state,prop){
 if(!propModel(prop.kind).seat)return false;const blocked=occupancy(state,{ignoreProp:prop.id}).blocked;
 for(let x=-2;x<=2;x++)for(let z=-1;z<=7;z++){const[dx,dz]=rotate(x,z,prop.r),xx=prop.x+dx,zz=prop.z+dz;if(!inside(xx,zz)||water(state,xx,zz)||blocked.has(key(xx,zz)))return false;}return true;
}
