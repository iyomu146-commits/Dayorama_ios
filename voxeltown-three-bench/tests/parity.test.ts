import {test} from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';import {resolve} from 'node:path';
import {h32,u01} from '../src/hash';import {resolveBundle} from '../src/world';import type {Bundle} from '../src/types';

export function localBundle():Bundle {
  const root=resolve('public/data'),read=(p:string)=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
  const tile=read('tiles/tile002.json'),templates:Bundle['templates']={};
  for(const p of tile.placements)templates[p.template]=read(`templates/${p.template}.json`);
  return {tile,templates,palette:read(`palettes/${tile.palette}.json`),look:read(`look/${tile.look}.json`),manifest:read('manifest.json')};
}
test('formatVersion 1: TS cellhash is exactly Python h32/u01; scene resolution is byte-identical',()=>{
  const python=process.env.BENCH_PYTHON||'C:/calude/sleepwork/dayorama-format-v1/.venv/Scripts/python.exe';
  const source=process.env.FORMAT_SOURCE||'C:/calude/voxeltown';
  const run=spawnSync(python,['-B','tools/python-reference.py',source,resolve('public/data')],{encoding:'utf8',maxBuffer:8*1024*1024});
  assert.equal(run.status,0,run.stderr);const ref=JSON.parse(run.stdout);
  for(const [x,y,z,s,h,u] of ref.hashes){assert.equal(h32(x,y,z,s),h);assert.equal(u01(x,y,z,s),u);}
  const world=resolveBundle(localBundle());
  const sha=createHash('sha256').update(world.grid).digest('hex');assert.equal(sha,ref.gridSha256);
  const pieces=world.pieces.filter(p=>p.active).map(({value,box,source})=>({value,box,source}));assert.deepEqual(pieces,ref.pieces);
  mkdirSync('reports',{recursive:true});writeFileSync('reports/parity.json',JSON.stringify({passed:true,hashVectors:ref.hashes.length,occupied:ref.occupied,pieces:pieces.length,gridSha256:sha,formatVersion:1,cellHash:'cellhash-v1'},null,2));
});
