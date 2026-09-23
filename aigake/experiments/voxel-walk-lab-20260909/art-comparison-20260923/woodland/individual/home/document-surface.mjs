// Describe the shader already implemented and captured; do not alter gate thresholds.
import fs from 'node:fs';
const path=new URL('./sculpt-spec.json',import.meta.url),spec=JSON.parse(fs.readFileSync(path));
for(const c of spec.componentTree){
 const roof=['roof','ridge','porch'].includes(c.id),wood=c.id==='door'||c.id.startsWith('rail-'),brick=c.id==='chimney';
 c.surfaceDetail={macroRoughness:roof?.70:wood?.79:brick?.94:.91,microRoughness:roof?.13:wood?.10:.06,bumpAmplitude:roof?.0033:wood?.00065:brick?.0007:.0008,normalPattern:'Material-local world-position noise perturbs the shading normal through screen-space derivatives; fades by pixel footprint. No geometric deformation.',displacementPattern:'None; exact 15cm surface retained.',occlusionPattern:'Voxel neighbour AO strength 0.08 and real shadow map; never albedo-as-AO.',edgeWearPattern:'None; no invented bevel geometry.',notes:'Implemented in material.mjs and cafe/material-study.mjs, microDetail=1. Multi-frequency plaster/slate mottling, axis-aligned wood grain and separate roughness response. Approximation, not measured PBR recovery. Front window frames also use stone/glass per-cell classification.'};
}
fs.writeFileSync(path,JSON.stringify(spec,null,2)+'\n');
