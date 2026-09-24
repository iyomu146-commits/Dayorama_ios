import {createCafeCells} from './model.mjs?v=grid5';
import {PALETTE} from './palette.mjs?v=roof16';

export const ROOF_LANE_WIDTH=5;
export const ROOF_PHASES=[0,0,0,0,0,0,0,0];
export const DESIGN_PALETTE={...PALETTE,
 plaster:'#ead6aa',plasterLight:'#f2e3c1',plasterWarm:'#dbc398',repair:'#c7ab83',repairPink:'#c68d6b',ivory:'#f0e2c0',
 brick:'#a75e41',brickLight:'#c07a50',brickDark:'#874a35',brickWarm:'#b36846',
 wood:'#a8753c',woodLight:'#c28e4e',woodDark:'#754c2e',woodPanel:'#ac783c',woodEdge:'#91602f',
 slate:'#30575e',slate2:'#3b646a',slateMuted:'#46696b',slateDark:'#233f48',slateEdge:'#284b53',slateJoint:'#34545b',
 slateSage:'#637d6c',slateSage2:'#728876',slatePatina:'#4c7071',slateSagePatina:'#7d927c',
 glass:'#426c6a',glassDeep:'#304f56',glassMid:'#67968c',glassPale:'#89a99d',
 cloth:'#c17949',clothLight:'#d79258',stone:'#c8b99b',stoneLight:'#ddcfad',stoneShade:'#ac9c80'
};

const tones=[
 ['slate','slate2','slateMuted','slate','slate2','slate'],
 ['slate2','slate','slate','slateMuted','slate','slate2'],
 ['slate','slateSage','slateSage2','slate2','slateSage','slate'],
 ['slateMuted','slateSage2','slateSage','slate','slateMuted','slate2'],
 ['slate','slate2','slateMuted','slate','slate2','slate'],
 ['slate2','slateMuted','slate','slate2','slate','slateMuted'],
 ['slate','slate2','slate','slateMuted','slate2','slate'],
 ['slate2','slateSage','slateSage2','slate2','slateSage','slate'],
 ['slate','slateSage2','slateSage','slateMuted','slateSage','slate2'],
 ['slateMuted','slate','slate2','slate','slate2','slate']
];

const pairedTone={slate:'slate2',slate2:'slateMuted',slateMuted:'slate2',slateSage:'slateSage2',slateSage2:'slateSage'};
// Repeat two cells + two subtly different cells + one dark joint across X.
// The joint is filled to the same height; no lowered strips or open grooves.
// The source remains editable 15cm cubes; no enlarged primitives are introduced.
export function createRoofDesignCells(source=createCafeCells()){
 const replaced=new Set(['roof','tiles','ridge']);
 const cells=new Map([...source].filter(([,c])=>!replaced.has(c.part)).map(([k,c])=>[k,{...c}]));
 const put=(part,x,y,z,color,extra={})=>{
  const key=`${x},${y},${z}`;
  if(cells.get(key)?.part==='chimney')return;
  cells.set(key,{x,y,z,part,color,phase:3,...extra});
 };
 for(const sign of [-1,1])for(let lane=0;lane<ROOF_PHASES.length;lane++)for(let row=0;row<6;row++){
  const phase=ROOF_PHASES[lane],start=Math.max(0,row*3-phase),end=row===5?18:(row+1)*3-phase;
  for(let x=-20+lane*ROOF_LANE_WIDTH;x<-20+(lane+1)*ROOF_LANE_WIDTH;x++)for(let s=start;s<end;s++){
   const z=sign>0?17-s:s-18,y=22+row*2,within=(x+20)%ROOF_LANE_WIDTH,base=tones[[0,1,2,4,5,6,7,9][lane]][row];
   const color=within===4?'slateJoint':within<2?base:pairedTone[base],meta={roofPhase:phase,roofLane:lane,roofCourse:row,roofLaneWidth:ROOF_LANE_WIDTH};
   // The base overlaps the next course by a shared height, including across lanes.
   for(let h=y-1;h<=y;h++)if(cells.get(`${x},${h},${z}`)?.part!=='fascia')put('roof',x,h,z,color);
   put('tiles',x,y+1,z,color,meta);
   put('tiles',x,y+2,z,color,meta);
  }
 }
 for(let x=-20;x<20;x++)for(let z=-1;z<=0;z++)for(let y=34;y<=35;y++)put('ridge',x,y,z,Math.floor((x+20)/ROOF_LANE_WIDTH)%3===1?'slateMuted':'slateEdge');
 cells.finishUnits=(source.finishUnits||[]).filter(u=>!replaced.has(u.part)&&u.keys.every(k=>cells.get(k)?.finishUnit===u.id));
 return cells;
}
