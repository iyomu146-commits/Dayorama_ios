import type {StorySpec} from './story-state';

/** Cull only complete unit cubes surrounded by six other complete unit cubes.
 * Stop culling before any neighbour becomes an inset finish piece. Conservatively
 * delay by 2ms at each edge so float32 shader times cannot expose a hole.
 * This is a presentation mask; data, order, shadows and visible surfaces are unchanged.
 */
export function interiorRanges(s:StorySpec):Float32Array {
 const result=new Float32Array(s.instances.length*2).fill(1e8);
 const unitRows=s.instances.slice(0,s.cells.length);
 if(unitRows.some(r=>r[11]!==1||r.slice(3,6).some(size=>Math.abs(size-.15)>1e-7)))throw Error('Expected ordered 15cm unit cubes');
 const lookup=new Map(s.cells.map((c,i)=>[c.slice(0,3).join(','),i]));
 const offsets=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 for(let i=0;i<s.cells.length;i++){
  const c=s.cells[i],r=unitRows[i];let start=r[9]+s.fallDuration+.002,end=r[10]-.002;
  for(const d of offsets){
   const j=lookup.get(c.slice(0,3).map((v,k)=>v+d[k]).join(','));
   if(j===undefined){end=-1;break;}
   const neighbour=unitRows[j];start=Math.max(start,neighbour[9]+s.fallDuration+.002);end=Math.min(end,neighbour[10]-.002);
  }
  if(start<end){result[2*i]=start;result[2*i+1]=end;}
 }
 return result;
}

export const interiorShader='if(uStoryTime>=aInterior.x && uStoryTime<aInterior.y) transformed=vec3(0.);\n#include <project_vertex>';
