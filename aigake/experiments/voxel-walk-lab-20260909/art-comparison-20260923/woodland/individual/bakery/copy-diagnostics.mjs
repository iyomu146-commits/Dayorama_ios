// Reuse diagnostics only; no geometry, reference pixels or review scores are copied.
import fs from 'node:fs';
for(const name of ['check-material-footprints.py','record-footprint-diagnostic.py']){
 let text=fs.readFileSync(new URL('../home/'+name,import.meta.url),'utf8').replaceAll('home-','bakery-');
 text=text.replace("['roof','chimney','lower-wall','upper-wall','front-low','front-upper-left','front-upper-right','door','porch','rail-left','rail-right','chimney-cap']","['building','roof','wing','awning','shop-left','shop-right','door','bread-left','bread-right','herb-left','herb-right','chimney-rim']");
 text=text.replace('21 visible components, internal floor unobserved','27 specified components; actual visible count and occlusion reported per capture');
 fs.writeFileSync(new URL('./'+name,import.meta.url),text);
}
