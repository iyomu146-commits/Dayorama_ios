import type {StorySpec} from './story-state';
import {interiorRanges} from './story-occlusion';

/** Time-ordered dense draw list. Retires whole occluded cubes without changing
 * their logical order. Swap removal touches only changed GPU buffer slots.
 */
export class StoryDrawList {
 readonly events:{time:number;source:number;show:boolean}[]=[];
 readonly sources:Int32Array;readonly slots:Int32Array;
 count=0;cursor=0;time=-Infinity;
 constructor(s:StorySpec){
  this.sources=new Int32Array(s.instances.length).fill(-1);this.slots=this.sources.slice();
  const masks=interiorRanges(s);
  s.instances.forEach((r,i)=>{
   // Match the float32 timing attributes used by the original GPU shader.
   const birth=Math.fround(r[9]),death=Math.fround(r[10]);
   this.events.push({time:birth,source:i,show:true},{time:death,source:i,show:false});
   const lo=masks[i*2],hi=masks[i*2+1];
   if(lo<hi)this.events.push({time:lo,source:i,show:false},{time:hi,source:i,show:true});
  });
  this.events.sort((a,b)=>a.time-b.time||Number(a.show)-Number(b.show)||a.source-b.source);
 }
 update(value:number):number[]{
  const t=Math.fround(value),dirty=new Set<number>();
  if(t<this.time){this.count=0;this.cursor=0;this.slots.fill(-1);this.sources.fill(-1);}
  while(this.cursor<this.events.length&&this.events[this.cursor].time<=t){
   const e=this.events[this.cursor++],slot=this.slots[e.source];
   if(e.show){if(slot>=0)continue;this.sources[this.count]=e.source;this.slots[e.source]=this.count;dirty.add(this.count++);}
   else if(slot>=0){
    this.count--;this.slots[e.source]=-1;
    if(slot!==this.count){const moved=this.sources[this.count];this.sources[slot]=moved;this.slots[moved]=slot;dirty.add(slot);}
    this.sources[this.count]=-1;
   }
  }
  this.time=t;
  return [...dirty].filter(slot=>slot<this.count);
 }
}

/** Accepts Three-like buffer attributes, also usable by the on-device diagnostic. */
export function attachStoryDrawList(mesh:any,s:StorySpec){
 const list=new StoryDrawList(s);
 const buffers=[mesh.instanceMatrix,mesh.instanceColor,mesh.geometry.getAttribute('aStory'),mesh.geometry.getAttribute('aHeight')];
 const original=buffers.map((a:any)=>a.array.slice() as Float32Array);
 return {
  list,
  update(t:number){
   const dirty=list.update(t);
   for(let k=0;k<buffers.length;k++){
    const a=buffers[k],width=a.itemSize;
    // A seek before rendering may leave pending updates: retain those ranges.
    for(const slot of dirty){const source=list.sources[slot];a.array.set(original[k].subarray(source*width,(source+1)*width),slot*width);a.addUpdateRange(slot*width,width);}
    if(dirty.length)a.needsUpdate=true;
   }
   mesh.count=list.count;
  },
  restore(){buffers.forEach((a:any,k:number)=>{a.array.set(original[k]);a.clearUpdateRanges();a.needsUpdate=true;});mesh.count=s.instances.length;}
 };
}
