import test from 'node:test';
import assert from 'node:assert/strict';
import {PROPS,propModel,placedCells} from './props.mjs';
import {initialState,validateState,buildingModel,auditTown,mutateBuilding,addExtension,advance,resetConstruction,exportTown,importTown,totalSteps,canPlaceProp,visibleCells,propVisible,TYPES,SITES} from './model.mjs';
function disconnected(cells){const map=new Map(cells.map(c=>[`${c.x},${c.y},${c.z}`,c])),q=cells.filter(c=>c.y===Math.min(...cells.map(c=>c.y))),seen=new Set(q.map(c=>`${c.x},${c.y},${c.z}`));for(let i=0;i<q.length;i++){const c=q[i];for(const[x,y,z]of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const k=`${c.x+x},${c.y+y},${c.z+z}`;if(map.has(k)&&!seen.has(k)){seen.add(k);q.push(map.get(k));}}}return map.size-seen.size;}
test('44 authored props are grounded and connected in all rotations',()=>{
 const basic=Object.values(PROPS).filter(p=>p.tier==='free');assert.equal(basic.length,44);
 for(const {id:kind} of basic)for(let r=0;r<4;r++){const cells=placedCells({id:'test',kind,x:0,z:0,r});assert.ok(cells.length>4,kind);assert.equal(disconnected(cells),0,kind);assert.ok(cells.every(c=>c.y>=1),kind);}
});
test('initial town and all architecture / dry site variants pass placement and access',()=>{
 const start=initialState();assert.equal(auditTown(start).ok,true);
 for(const type of Object.keys(TYPES))for(const site of ['normal','corner','narrow'])for(const r of [0,1,2,3]){const state=structuredClone(start);state.props=[];state.buildings[1]={...state.buildings[1],type,site,r};const report=auditTown(state);assert.deepEqual(report.errors,[],JSON.stringify({type,site,r}));}
});
test('new extensions reserve room and construction keeps existing building',()=>{
 const state=initialState();for(const kind of ['terrace','workshop','residence']){const next=addExtension(state,'b1',kind),b=next.buildings[1];assert.equal(auditTown(next).ok,true);assert.equal(b.addons[0].steps,0);assert.ok(visibleCells(b).length>3000);const walked=advance(next,5000,'b1');assert.equal(walked.buildings[1].addons[0].steps,5000);assert.ok(visibleCells(walked.buildings[1]).length>visibleCells(b).length);}
 assert.throws(()=>addExtension(state,'b3','terrace'));assert.throws(()=>addExtension(state,'b0','residence'));
});
test('waterfront must physically contact the water and stay on land',()=>{
 const state=initialState();state.props=[];state.region='canal';const next=mutateBuilding(state,'b3',{site:'waterfront',r:0});assert.ok(auditTown(next).ok);assert.throws(()=>mutateBuilding(next,'b3',{r:2}));state.region='grove';assert.throws(()=>mutateBuilding(state,'b3',{site:'waterfront',r:0}));
});
test('workshop connection stays closed until the extension is finished',()=>{
 const state=initialState(),next=addExtension(state,'b1','workshop'),b=next.buildings[1],model=buildingModel(b),cellKey=c=>`${c.x},${c.y},${c.z}`;
 assert.deepEqual(visibleCells(b),visibleCells(state.buildings[1]));
 const initialWall=visibleCells(b).filter(c=>model.workshopRemove.has(cellKey(c)));assert.ok(initialWall.length>0);
 const halfway=visibleCells(advance(next,2500,'b1').buildings[1]);assert.ok(initialWall.every(c=>halfway.some(v=>cellKey(v)===cellKey(c))));
 const finished=visibleCells(advance(next,5000,'b1').buildings[1]);assert.ok(initialWall.every(c=>!finished.some(v=>cellKey(v)===cellKey(c))));
});
test('placement rejects roads, water, building overlap, entry and duplicate objects',()=>{
 const state=initialState(),p={id:'ptest',kind:'chair',x:0,z:0,r:0};assert.match(canPlaceProp(state,p),/道/);assert.ok(canPlaceProp(state,{...p,x:-32,z:-18}));assert.ok(canPlaceProp(state,{...p,x:32,z:-28}));assert.ok(canPlaceProp({...state,region:'canal'},{...p,x:20,z:54}));assert.ok(canPlaceProp(state,{...p,x:-15,z:-7}));assert.equal(canPlaceProp(state,{...p,x:14,z:16}),null);
});
test('sharing resets construction but preserves layout; malformed imports rejected',()=>{
 const state=initialState(),round=importTown(exportTown(state));assert.equal(totalSteps(round),0);assert.deepEqual(round.props,state.props);assert.equal(round.buildings[2].addons[0].steps,0);assert.ok(auditTown(round).ok);
 assert.throws(()=>importTown('{"format":"other"}'));assert.throws(()=>validateState({...state,props:[{id:'bad',kind:'unknown'}]}));assert.throws(()=>validateState({...state,buildings:[]}));assert.throws(()=>importTown(' '.repeat(400001)));
});
test('steps are deterministic and vegetation reveals as whole objects',()=>{
 const a=resetConstruction(initialState()),b=advance(a,12000,'b0'),c=advance(advance(a,5000,'b0'),7000,'b0');assert.deepEqual(b,c);assert.equal(totalSteps(a),0);assert.equal(totalSteps(b),12000);assert.equal(propVisible(a,a.props[3],false),false);assert.equal(propVisible(advance(a,90000),a.props[3],false),true);assert.equal(typeof propVisible(b,b.props[3],false),'boolean');
});
