import type {Piece} from './world';
export interface StorySpec {
 version:number;id:string;sourceGridSha256:string;contextGridSha256:string;
 duration:number;buildStart:number;buildDuration:number;fallDuration:number;fallHeight:number;finishTime:number;lightsTime:number;residentTime:number;
 cells:number[][];instances:number[][];contextPatch:number[][];contextPieces:Piece[];
 camera:{target:number[];offset:number[];zoom:number;finishZoom:number};
 actor:{boxes:[string,number[],number[],string][];start:number[];end:number[];waypoints:number[][];walkDuration:number;waveStart:number;waveDuration:number};
 lightBounds:{min:number[];max:number[]};
}
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
export function storyState(s:StorySpec,t:number){
 const n=Math.max(0,Math.min(s.cells.length,Math.floor((t-s.buildStart-s.fallDuration)/s.buildDuration*(s.cells.length-1))+1));
 const walk=clamp((t-s.residentTime)/s.actor.walkDuration),step=Math.sin((t-s.residentTime)*Math.PI*3.6),walking=walk>0&&walk<1;
 const waveTime=t-s.actor.waveStart,wave=waveTime>=0&&waveTime<s.actor.waveDuration?Math.sin(waveTime*Math.PI/s.actor.waveDuration):0;
 const route=s.actor.waypoints;let a=route[0],b=route[1];for(let i=1;i<route.length;i++){a=route[i-1];b=route[i];if(walk<=b[0])break;}
 const fraction=clamp((walk-a[0])/(b[0]-a[0]));const actorPosition=a.slice(1).map((v,i)=>v+(b[i+1]-v)*fraction),heading=Math.atan2(b[1]-a[1],-(b[2]-a[2]));
 return {n,finished:t>=s.finishTime,light:smooth((t-s.lightsTime)/1.1),walk,walking,step:walking?step:0,wave,
  actorVisible:t>=s.residentTime,actorPosition,heading,
  zoom:s.camera.zoom+(s.camera.finishZoom-s.camera.zoom)*smooth((t-s.finishTime)/1.5),
  phase:t<s.buildStart?'開始':t<s.finishTime?'建築中':t<s.lightsTime?'完成':t<s.residentTime?'灯り':t<s.duration?'暮らし':'再生終了'};
}
