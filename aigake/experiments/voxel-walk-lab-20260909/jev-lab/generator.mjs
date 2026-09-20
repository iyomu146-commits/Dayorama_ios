import {validateDesign,FIELDS} from './design.mjs';
const xy=(x,z)=>`${x},${z}`,xyz=(x,y,z)=>`${x},${y},${z}`;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
export function generate(input,{narrow=false}={}){
  const d=validateDesign(input),cells=new Map(),footprint=new Map(),roofColumns=new Map(),doors=[],props=[];
  const C={wall:{plaster:'#e9dec4',brick:'#ae7058',timber:'#b28c64'}[d.wall],roof:{clay:'#ad624b',sage:'#587b6c',slate:'#586f88'}[d.roofColor],frame:'#7d6049',trim:'#f2e4c9',glass:'#9bbfb8',base:'#b6a48a',paving:'#d6c8ac',wood:'#997449',light:'#e4be66'};
  const put=(x,y,z,color,phase=2,tag='')=>cells.set(xyz(x,y,z),{x,y,z,color,phase,tag});
  const box=(a,b,c,x,y,z,color,phase=2,tag='')=>{for(let yy=b;yy<=y;yy++)for(let zz=c;zz<=z;zz++)for(let xx=a;xx<=x;xx++)put(xx,yy,zz,color,phase,tag);};
  const shift=d.layout==='courtyard'?0:d.terrace==='left'?4:d.terrace==='right'?-4:0;
  const halfWidth=narrow?9:12;
  const xmin=d.layout==='courtyard'?-15:-halfWidth+shift,xmax=d.layout==='courtyard'?15:halfWidth+shift,zmin=narrow?-16:-12,zmax=narrow?14:10;
  for(let x=xmin;x<=xmax;x++)for(let z=zmin;z<=zmax;z++){
    if(d.layout==='ell'&&x>shift-1&&z>0)continue;
    if(d.layout==='courtyard'&&Math.abs(x)<6&&z>-4)continue;
    footprint.set(xy(x,z),{x,z});
  }
  const has=(x,z)=>footprint.has(xy(x,z)),boundary=(x,z)=>directions.some(([a,b])=>!has(x+a,z+b));
  const levels=d.floors==='two'?2:1,H=levels*16;
  // All paving, thresholds and furniture share the same top surface at y=.5.
  box(-27,0,-18,27,0,20,C.paving,0,'paving');
  for(const {x,z} of footprint.values()){
    put(x,0,z,C.base,0,'foundation');
    if(levels===2)put(x,16,z,C.wood,1,'floor');
    if(!boundary(x,z))continue;
    for(let y=1;y<=H;y++){
      const corner=directions.filter(([a,b])=>!has(x+a,z+b)).length>1;
      const frame=corner||y%16===0||((x+24)%8===0&&(!has(x,z+1)||!has(x,z-1)))||((z+24)%8===0&&(!has(x+1,z)||!has(x-1,z)));
      const brick=d.wall==='brick'&&y%3===0,wood=d.wall==='timber'&&y%4===0;
      put(x,y,z,frame?C.frame:brick?'#bd896b':wood?'#a27c58':C.wall,frame?1:2,frame?'frame':'wall');
    }
  }
  // Derive a closed roof from the complete footprint rather than overlapping hollow modules.
  const roofFoot=new Set();for(const {x,z} of footprint.values())for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)roofFoot.add(xy(x+a,z+b));
  const roofHas=(x,z)=>roofFoot.has(xy(x,z));
  // Erosion distance includes diagonal concave corners, avoiding a spire at the L joint.
  const depths=new Map(),rim=[];
  for(const key of roofFoot){const [x,z]=key.split(',').map(Number);let edge=false;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(!roofHas(x+a,z+b))edge=true;if(edge){depths.set(key,0);rim.push({x,z});}}
  for(let i=0;i<rim.length;i++){const {x,z}=rim[i],depth=depths.get(xy(x,z));for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const key=xy(x+a,z+b);if(roofFoot.has(key)&&!depths.has(key)){depths.set(key,depth+1);rim.push({x:x+a,z:z+b});}}}
  function runDepth(x,z,axis){let a=0,b=0;while(roofHas(x-(axis===0?a+1:0),z-(axis===1?a+1:0)))a++;while(roofHas(x+(axis===0?b+1:0),z+(axis===1?b+1:0)))b++;return Math.min(a,b);}
  for(const key of roofFoot){const [x,z]=key.split(',').map(Number),depth=d.roof==='hip'?depths.get(key):runDepth(x,z,0);roofColumns.set(key,H+1+(d.roof==='flat'?0:Math.min(7,Math.floor(depth*.65))));}
  for(const [key,y] of roofColumns){const [x,z]=key.split(',').map(Number),neighbor=Math.min(y,...directions.map(([a,b])=>roofColumns.get(xy(x+a,z+b))??y));
    if(has(x,z)&&boundary(x,z))box(x,H+1,z,x,y-1,z,C.wall,2,'gable');
    box(x,neighbor,z,x,y+1,z,C.roof,2,'roof');
    if(d.roof==='flat'&&has(x,z)&&boundary(x,z))put(x,y+2,z,C.roof,2,'parapet');
  }
  // Ground-floor entrance faces the open street / courtyard.
  const dx=d.layout==='ell'?xmin+5:shift,dz=d.layout==='courtyard'?-4:zmax,half=d.entrance==='wide'?3:2;
  doors.push({x:dx,z:dz,half,bottom:1,top:10,canopy:13});
  function windowAt(x,z,axis,centerY){const r=d.windows==='wide'?2:1;
    for(let a=-r-1;a<=r+1;a++)for(let yy=0;yy<7;yy++){
      const xx=x+(axis===0?a:0),zz=z+(axis===1?a:0),y=centerY+yy;
      if(!has(xx,zz)||!boundary(xx,zz))continue;
      if(Math.abs(xx-dx)<=half+2&&Math.abs(zz-dz)<=1&&y<=14)continue;
      const trim=Math.abs(a)===r+1||yy===0||yy===6;
      put(xx,y,zz,trim?C.trim:a===0?C.frame:C.glass,2,trim?'window-frame':'glass');
    }
  }
  for(const {x,z} of footprint.values())for(let level=0;level<levels;level++){
    if((!has(x,z+1)||!has(x,z-1))&&(x+24)%8===4&&[-3,-2,-1,0,1,2,3].every(a=>has(x+a,z)))windowAt(x,z,0,4+level*16);
    if((!has(x+1,z)||!has(x-1,z))&&(z+24)%8===4&&[-3,-2,-1,0,1,2,3].every(a=>has(x,z+a)))windowAt(x,z,1,4+level*16);
  }
  box(dx-half-1,1,dz,dx+half+1,11,dz,C.trim,2,'door-frame');
  box(dx-half,1,dz,dx+half,10,dz,C.frame,3,'door');
  box(dx-half+1,5,dz,dx+half-1,9,dz,C.glass,3,'door-glass');put(dx+half-1,4,dz+1,C.light,3,'handle');
  box(dx-half-2,13,dz+1,dx+half+2,14,dz+3,C.roof,2,'canopy');
  for(const x of [dx-half-2,dx+half+2])box(x,1,dz+3,x,12,dz+3,C.frame,1,'canopy-post');
  function furniture(cx){
    // Chair backs point away from the table; four distinct legs contact the paving.
    for(const z of [-7,7]){
      for(const x of [cx-1,cx+1])for(const zz of [z-1,z+1])box(x,1,zz,x,3,zz,C.frame,3,'chair-leg');
      box(cx-2,4,z-2,cx+2,4,z+2,C.wood,3,'chair-seat');
      box(cx-2,5,z+Math.sign(z)*2,cx+2,8,z+Math.sign(z)*2,C.wood,3,'chair-back');
    }
    for(const x of [cx-2,cx+2])for(const z of [-2,2])box(x,1,z,x,5,z,C.frame,3,'table-leg');
    box(cx-3,6,-3,cx+3,6,3,C.wood,3,'table-top');put(cx,7,0,C.trim,3,'cup');
    props.push({type:'seating',x0:cx-3,x1:cx+3,z0:-9,z1:9});
  }
  if(d.terrace!=='none')furniture(d.terrace==='right'?22:-22);
  // Shop displays stay beside the entrance, with a free central approach.
  if(d.kind!=='house'){
    const sx=d.layout==='courtyard'?0:dx+half+6,sz=d.layout==='courtyard'?-5:dz;
    if(d.layout!=='courtyard'&&sx+2<=xmax){
      for(const x of [sx-2,sx+2])box(x,1,sz+2,x,4,sz+2,C.frame,3,'display-leg');
      box(sx-3,5,sz+1,sx+3,5,sz+3,C.wood,3,'display');
      for(const x of [sx-2,sx+1])box(x,6,sz+2,x+1,6,sz+2,d.kind==='bakery'?'#d9ac62':C.trim,3,'display-items');
      props.push({type:'display',x0:sx-3,x1:sx+3,z0:sz+1,z1:sz+3});
    }
    // A small wall-mounted plaque, below the eaves; no oversized sign sculpture.
    const px=d.layout==='ell'?shift+6:d.layout==='courtyard'?-10:xmin+5,pz=d.layout==='ell'?0:zmax;
    box(px-2,11,pz+1,px+2,13,pz+1,d.kind==='bakery'?'#b98952':'#597c70',3,'sign');
    for(const x of [px-1,px+1])put(x,12,pz+2,C.trim,3,'sign-letter');
  }
  // A continuous internal stair connects the second-floor opening to ground level.
  const stair={x0:xmin+2,x1:xmin+4,z0:zmin+2,z1:zmin+17};
  if(levels===2){
    for(let i=0;i<16;i++)for(let x=stair.x0;x<=stair.x1;x++){
      cells.delete(xyz(x,16,stair.z0+i));
      box(x,1,stair.z0+i,x,i+1,stair.z0+i,C.wood,1,'stair');
    }
  }
  const list=[...cells.values()].sort((a,b)=>a.phase-b.phase||a.y-b.y||a.z-b.z||a.x-b.x);
  const doc={format:'komorebi-voxel',version:1,title:FIELDS.kind.options[d.kind],author:'',region:'grove',cells:list.map(({tag,...c})=>c)};
  return{design:d,doc,cells:list,footprint:[...footprint.values()],roofColumns,doors,props,stair:levels===2?stair:null,height:H};
}
export function audit(g){
  const errors=[],map=new Map(g.cells.map(c=>[xyz(c.x,c.y,c.z),c]));
  if(g.cells.length>24000)errors.push('ブロック数超過');
  if(g.cells.some(c=>c.x < -27||c.x>27||c.z < -26||c.z>26||c.y<0||c.y>64))errors.push('敷地外のブロック');
  for(const {x,z} of g.footprint){const top=g.roofColumns.get(xy(x,z));if(!map.has(xyz(x,top,z))||!map.has(xyz(x,top+1,z))){errors.push('屋根の欠落');break;}}
  for(const door of g.doors){
    if(door.top>=door.canopy)errors.push('扉と庇の干渉');
    for(let z=door.z+1;z<=20;z++)for(let x=door.x-door.half;x<=door.x+door.half;x++)for(let y=1;y<=10;y++){
      const cell=map.get(xyz(x,y,z));if(cell&&cell.tag!=='handle')errors.push('入口の通路に障害物');
    }
  }
  for(const c of g.cells.filter(c=>/^(chair|table|display)-leg$/.test(c.tag)&&c.y===1))if(!map.has(xyz(c.x,0,c.z)))errors.push('家具の脚の接地不良');
  for(const prop of g.props)for(const {x,z} of g.footprint)if(x>=prop.x0&&x<=prop.x1&&z>=prop.z0&&z<=prop.z1)errors.push('家具と建物の重なり');
  const visited=new Set(),queue=g.cells.filter(c=>c.y===0);for(const c of queue)visited.add(xyz(c.x,c.y,c.z));
  for(let i=0;i<queue.length;i++){const c=queue[i];for(const [x,y,z] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const key=xyz(c.x+x,c.y+y,c.z+z);if(map.has(key)&&!visited.has(key)){visited.add(key);queue.push(map.get(key));}}}
  if(visited.size!==g.cells.length)errors.push('接続していないブロック');
  return{ok:errors.length===0,errors:[...new Set(errors)],checks:['屋根の被覆','入口の通路','家具の接地','部品の接続'],count:g.cells.length};
}
