import {hash} from '../model.mjs';
export function windowLighting(cells,seed){
 const glass=new Map(cells.filter(c=>c.surface===3).map(c=>[[c.x,c.y,c.z].join(','),c])),rooms=new Map();let room=0;
 for(const [key,cell]of glass){
  if(rooms.has(key))continue;
  const light={switch:.18+hash(seed,room++,731)*.65,strength:1},queue=[cell];rooms.set(key,light);
  for(let at=0;at<queue.length;at++){
   const c=queue[at];for(const [x,y,z]of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
    const k=[c.x+x,c.y+y,c.z+z].join(',');if(glass.has(k)&&!rooms.has(k)){rooms.set(k,light);queue.push(glass.get(k));}
   }
  }
  // A glazed greenhouse is not an enormous light bulb. Large connected glass
  // surfaces retain their blue-green body and only a restrained interior tint.
  light.strength=queue.length>80?Math.max(.045,20/queue.length):.8;
 }
 return rooms;
}
