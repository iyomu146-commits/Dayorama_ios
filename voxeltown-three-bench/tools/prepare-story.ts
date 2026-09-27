import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {decode,place,resolveBundle} from '../src/world';
import type {Bundle} from '../src/types';
import {palettePaint} from '../src/mesher';
import {u01} from '../src/hash';
const root=path.resolve(import.meta.dirname,'..'),data=path.join(root,'public/data');
const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(data,p),'utf8'));
const tile=read('tiles/tile002.json');
const bundle:Bundle={tile,look:read(`look/${tile.look}.json`),palette:read(`palettes/${tile.palette}.json`),templates:Object.fromEntries(tile.placements.map((a:any)=>[a.template,read(`templates/${a.template}.json`)])),manifest:read('manifest.json')};
const a=tile.placements.find((a:any)=>a.id==='house_b'),t=bundle.templates[a.template],bytes=decode(t.voxels),[w,d,h]=t.voxels.size;
const canonical:number[][]=[];
for(let z=0;z<h;z++)for(let y=0;y<d;y++)for(let x=0;x<w;x++){const v=bytes[x+w*(y+d*z)];if(v)canonical.push([...place([x,y,z],t,a),v]);}
const order=t.order.runs.flatMap(([start,n])=>Array.from({length:n},(_,i)=>start+i));
if(order.length!==canonical.length||new Set(order).size!==canonical.length||Math.min(...order)!==0||Math.max(...order)!==canonical.length-1)throw Error('Invalid canonical order');
const full=resolveBundle(bundle),context=resolveBundle({...bundle,tile:{...tile,placements:tile.placements.filter((p:any)=>p.id!==a.id)}});
const patch:number[][]=[];
for(let i=0;i<full.grid.length;i++)if(full.grid[i]!==context.grid[i]||full.owner[i]!==context.owner[i])patch.push([i,context.grid[i],context.owner[i]]);
const cells=order.map(i=>canonical[i]);
// layered-v1 orders complete finish units by their lowest layer; an individual
// unit can span several z layers. Never sort the frozen order again.
const ranks=new Map(cells.map((c,i)=>[full.index(c[0],c[1],c[2]),i]));
const pieces=full.pieces.filter(p=>p.source==='house_b'&&p.active);
const ends=new Map<number,number>();
for(const p of pieces){let end=-1;full.eachBox(p.box,(x,y,z)=>{end=Math.max(end,ranks.get(full.index(x,y,z))??-1);});ends.set(p.id,end);}
const paint=palettePaint(full),origin=tile.originCell;
const color=(v:number,x:number,y:number,z:number,channel=0)=>{const p=paint.get(v)!;return p.color.clone().multiplyScalar(1+p.jitter*(2*u01(x+origin[0],y+origin[1],z+origin[2],channel)-1)).toArray();};
const birth=(rank:number)=>1.4+18.6*rank/(cells.length-1);
const instances=cells.map((c,i)=>{const owner=full.getOwner(c[0],c[1],c[2]),end=ends.get(owner);return [(c[0]+.5)*.15,(c[1]+.5)*.15,(c[2]+.5)*.15,.15,.15,.15,...color(c[3],c[0],c[1],c[2]),birth(i),end===undefined?1000:birth(end)+.32,1];});
for(const p of pieces){const b=p.box,e=bundle.palette.entries.find(e=>e.index===p.value)!,g=bundle.look.surfaces[e.surface].joint??bundle.look.jointDefault;instances.push([(b[0]+b[3])*.075,(b[1]+b[4])*.075,(b[2]+b[5])*.075,(b[3]-b[0])*.15-2*g,(b[4]-b[1])*.15-2*g,(b[5]-b[2])*.15-2*g,...color(p.value,b[0],b[1],b[2],1),birth(ends.get(p.id)!)+.32,1000,0]);}
const hash=(x:Uint8Array)=>createHash('sha256').update(x).digest('hex');
const actorBoxes=[
 ['body',[0,0,.825],[.45,.30,.60],'#6f9088'],['head',[0,0,1.35],[.30,.30,.30],'#e8bd91'],
 ['hair',[0,.025,1.53],[.34,.30,.10],'#42322f'],['hairback',[0,.15,1.37],[.34,.075,.25],'#42322f'],
 ['eyeL',[-.075,-.155,1.36],[.03,.025,.03],'#43322c'],['eyeR',[.075,-.155,1.36],[.03,.025,.03],'#43322c'],
 ['armL',[-.285,0,.82],[.12,.15,.54],'#6f9088'],['armR',[.285,0,.82],[.12,.15,.54],'#6f9088'],
 ['handL',[-.285,0,.50],[.12,.15,.12],'#e8bd91'],['handR',[.285,0,.50],[.12,.15,.12],'#e8bd91'],
 ['legL',[-.12,0,.30],[.15,.18,.45],'#45425b'],['legR',[.12,0,.30],[.15,.18,.45],'#45425b'],
 ['shoeL',[-.12,-.045,.075],[.18,.27,.15],'#403933'],['shoeR',[.12,-.045,.075],[.18,.27,.15],'#403933']
];
const story={version:1,id:'house-b-life-v1',formatVersion:1,target:'house_b',sourceGridSha256:hash(full.grid),contextGridSha256:hash(context.grid),sourceFiles:bundle.manifest.files,
 duration:32,buildStart:1.4,buildDuration:18.6,fallDuration:.32,fallHeight:.60,finishTime:20.32,lightsTime:21.5,residentTime:23,
 cells,instances,contextPatch:patch,contextPieces:context.pieces,
 camera:{target:[10.1,7.2,4.9],offset:[24,-32,28.284],zoom:1.25,finishZoom:1.43},
 actor:{boxes:actorBoxes,start:[10.575,6.21,2.55],end:[11.775,3.675,2.4],waypoints:[[0,10.575,6.21,2.55],[.12,10.575,5.775,2.4],[.44,11.775,5.775,2.4],[1,11.775,3.675,2.4]],walkDuration:4.5,waveStart:28.0,waveDuration:2.0},
 lightBounds:{min:[9.15,4.35,2.25],max:[14.1,12,8.85]},
 notes:['Canonical order is unchanged. 15cm cells descend individually in the accelerated preview.','Instancing is used only for construction presentation; final geometry is the original cached scene, with declared finish pieces.','Prototype resident details are a non-voxel animation layer, not editable template content.','No BGM; identical temporary original sound effects in both engines.']};
const text=JSON.stringify(story)+'\n';
for(const dir of [path.join(root,'public/story'),path.resolve(root,'../voxeltown-godot-bench/story')]){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'story.json'),text);}
console.log(JSON.stringify({cells:cells.length,sourceHash:story.sourceGridSha256,contextHash:story.contextGridSha256,bytes:text.length}));
