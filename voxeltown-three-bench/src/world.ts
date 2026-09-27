import type {Block,Box,Bundle,Diff,Placement,Template,V3} from './types';

export const CHUNK=16,CELL=.15;
export interface Piece {id:number;box:Box;value:number;source:string;active:boolean;}
export const offset=(x:number,y:number,z:number,size:V3)=>x+size[0]*(y+size[1]*z);
export function decode(block:Block):Uint8Array {
  const [w,d,h]=block.size,out=new Uint8Array(w*d*h);
  if(block.encoding==='rows') {
    if(block.rows?.length!==d*h)throw Error('row count');
    block.rows.forEach((row,r)=>{
      if(!row)return;if(row.length!==w*2||!/^[0-9a-f]+$/i.test(row))throw Error('invalid voxel row');
      for(let x=0;x<w;x++)out[r*w+x]=parseInt(row.slice(x*2,x*2+2),16);
    });
  } else if(block.encoding==='rle') {
    let i=0;
    for(const token of block.rle!.split(',')) {
      const match=/^(\d+)\*([0-9a-f]{2})$/i.exec(token);if(!match)throw Error('invalid RLE');
      const n=Number(match[1]),v=parseInt(match[2],16);if(n<1||i+n>out.length)throw Error('RLE length');
      out.fill(v,i,i+n);i+=n;
    }
    if(i!==out.length)throw Error('RLE short');
  } else throw Error('unsupported encoding');
  return out;
}
export function rotate([x,y,z]:V3,r:number):V3 {
  return [[x,y,z],[-y,x,z],[-x,-y,z],[y,-x,z]][r] as V3;
}
export function place(p:V3,t:Template,a:Placement):V3 {
  const q=rotate(p.map((v,i)=>v-t.pivot[i]) as V3,a.rot??0);
  return q.map((v,i)=>v+a.at[i]) as V3;
}
export function placeBox(b:Box,t:Template,a:Placement):Box {
  const x=place(b.slice(0,3) as V3,t,a),y=place(b.slice(3).map(v=>v-1) as V3,t,a);
  return [...x.map((v,i)=>Math.min(v,y[i])),...x.map((v,i)=>Math.max(v,y[i])+1)] as Box;
}

export class World {
  grid:Uint8Array;owner:Int32Array;pieces:Piece[]=[];
  constructor(public bundle:Bundle) {
    const s=bundle.tile.size;this.grid=new Uint8Array(s[0]*s[1]*s[2]);this.owner=new Int32Array(this.grid.length);
  }
  get size(){return this.bundle.tile.size;}
  inside(x:number,y:number,z:number){return x>=0&&y>=0&&z>=0&&x<this.size[0]&&y<this.size[1]&&z<this.size[2];}
  index(x:number,y:number,z:number){return offset(x,y,z,this.size);}
  get(x:number,y:number,z:number){return this.inside(x,y,z)?this.grid[this.index(x,y,z)]:0;}
  getOwner(x:number,y:number,z:number){return this.inside(x,y,z)?this.owner[this.index(x,y,z)]:0;}
  write([x,y,z]:V3,value:number) {
    if(!this.inside(x,y,z))throw Error(`out of bounds ${x},${y},${z}`);
    const i=this.index(x,y,z);this.grid[i]=value;this.owner[i]=0;
  }
  addPiece(box:Box,source:string) {
    const id=this.pieces.length+1,value=this.get(box[0],box[1],box[2]);
    if(!value)throw Error('empty piece');
    this.eachBox(box,(x,y,z)=>{if(this.get(x,y,z)!==value)throw Error('non-uniform piece');this.owner[this.index(x,y,z)]=id;});
    this.pieces.push({id,box,value,source,active:true});
  }
  eachBox(b:Box,fn:(x:number,y:number,z:number)=>void) {
    for(let z=b[2];z<b[5];z++)for(let y=b[1];y<b[4];y++)for(let x=b[0];x<b[3];x++)fn(x,y,z);
  }
  finalizePieces() {
    const counts=new Uint32Array(this.pieces.length+1);
    for(const i of this.owner)counts[i]++;
    for(const p of this.pieces){const b=p.box;p.active=counts[p.id]===(b[3]-b[0])*(b[4]-b[1])*(b[5]-b[2]);}
    for(let i=0;i<this.owner.length;i++)if(this.owner[i]&&!this.pieces[this.owner[i]-1].active)this.owner[i]=0;
  }
  // Invalidation includes seam faces/AO and all fragments of an edited finish piece.
  edit(p:V3,value:number):{chunks:string[];before:number;brokenPiece:number|null} {
    if(!this.inside(...p))throw Error('outside tile');
    const i=this.index(...p),before=this.grid[i],id=this.owner[i],dirty=new Set<string>();
    if(before===value)throw Error('no change');
    if(value&&!this.bundle.palette.entries.some(e=>e.index===value))throw Error('palette missing');
    const mark=(x:number,y:number,z:number)=>{
      for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const a=x+dx,b=y+dy,c=z+dz;if(this.inside(a,b,c))dirty.add(`${a>>4},${b>>4},${c>>4}`);
      }
    };
    if(id) {
      const piece=this.pieces[id-1];piece.active=false;
      this.eachBox(piece.box,(x,y,z)=>{if(this.getOwner(x,y,z)===id)this.owner[this.index(x,y,z)]=0;mark(x,y,z);});
    }
    this.write(p,value);mark(...p);
    return {chunks:[...dirty].sort(),before,brokenPiece:id||null};
  }
  occupiedChunkKeys():string[] {
    const set=new Set<string>();
    const [w,d,h]=this.size;
    for(let z=0;z<h;z++)for(let y=0;y<d;y++)for(let x=0;x<w;x++)if(this.get(x,y,z))set.add(`${x>>4},${y>>4},${z>>4}`);
    return [...set];
  }
}

export function resolveBundle(bundle:Bundle):World {
  const docs=[bundle.tile,bundle.look,bundle.palette,...Object.values(bundle.templates)];
  if(docs.some(d=>d.formatVersion!==1)||bundle.look.cellHash!=='cellhash-v1')throw Error('unsupported format/hash version');
  if(bundle.tile.chunk!==16||bundle.tile.cellSize!==.15)throw Error('unsupported grid');
  const world=new World(bundle),tile=bundle.tile;
  for(const [key,block] of Object.entries(tile.base.chunks)) {
    const base=key.split(',').map(v=>Number(v)*16),data=decode(block);
    if(block.size.some(v=>v!==16))throw Error('chunk size');
    for(let z=0;z<16;z++)for(let y=0;y<16;y++)for(let x=0;x<16;x++) {
      const v=data[x+16*(y+16*z)];if(v)world.write([base[0]+x,base[1]+y,base[2]+z],v);
    }
  }
  for(const box of tile.base.pieces)world.addPiece(box,'base');
  for(const a of tile.placements) {
    const t=bundle.templates[a.template];if(!t)throw Error('template missing');
    if(t.palette!==tile.palette)throw Error('palette mismatch');
    const data=decode(t.voxels),[w,d,h]=t.voxels.size;
    const N=data.reduce((n,v)=>n+(v?1:0),0);
    if(a.progress!=null&&a.progress!==N)throw Error('This benchmark accepts completed placements only; no order animation.');
    for(let z=0;z<h;z++)for(let y=0;y<d;y++)for(let x=0;x<w;x++) {
      const v=data[x+w*(y+d*z)];if(v)world.write(place([x,y,z],t,a),v);
    }
    for(const box of t.pieces)world.addPiece(placeBox(box,t,a),a.id);
    applyDiff(world,a.diff??{},p=>place(p,t,a));
  }
  for(const zone of tile.zones) {
    applyDiff(world,zone.diff,p=>{
      if(p.some((v,k)=>v<zone.min[k]||v>=zone.max[k]))throw Error('zone bounds');return p;
    });
  }
  world.finalizePieces();
  const valid=new Set(bundle.palette.entries.map(e=>e.index));
  for(const v of world.grid)if(v&&!valid.has(v))throw Error('undefined palette');
  return world;
}
function applyDiff(world:World,diff:Diff,transform:(p:V3)=>V3) {
  for(const kind of ['remove','paint','add'] as const)for(const row of diff[kind]??[]) {
    const p=transform(row.slice(0,3) as V3),value=kind==='remove'?0:row[3]!;
    world.write(p,value);
  }
}

export async function loadBundle():Promise<Bundle> {
  const manifest=await fetch('/data/manifest.json').then(r=>r.json());
  async function get<T>(path:string):Promise<T> {
    const r=await fetch('/data/'+path);if(!r.ok)throw Error(`data ${path}: ${r.status}`);
    const bytes=await r.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    if(digest!==manifest.files[path])throw Error('data fingerprint mismatch: '+path);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  const tile=await get<Bundle['tile']>('tiles/tile002.json');
  const [palette,look]=await Promise.all([get<Bundle['palette']>(`palettes/${tile.palette}.json`),get<Bundle['look']>(`look/${tile.look}.json`)]);
  const templates:Record<string,Template>={};
  await Promise.all([...new Set(tile.placements.map(p=>p.template))].map(async id=>{templates[id]=await get<Template>(`templates/${id}.json`);}));
  return {tile,palette,look,templates,manifest};
}
