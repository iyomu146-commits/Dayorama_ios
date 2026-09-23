// Author the home specification from its own exact crop, never the cafe's geometry.
import fs from 'node:fs';
const spec=JSON.parse(fs.readFileSync(new URL('./sculpt-spec.json',import.meta.url))),assessment=JSON.parse(fs.readFileSync(new URL('./assessment.json',import.meta.url)));
if(spec.reviewHistory?.length)throw Error('Initial authoring only: preserve existing reviews and refine the current spec explicitly.');
const base=structuredClone(spec.componentTree[0]),matBase=structuredClone(spec.materials[0]);
const defs=[
 ['building','macro',null,[-20,0,-16],[40,33,32],'cream','Two-storey rectangular body; front +Z; no invented rear openings.'],
 ['roof','macro','building',[-23,32,-20],[46,17,40],'slate','Stepped gable with ridge parallel to front, closed underside and three-cell eaves.'],
 ['chimney','macro','roof',[12,39,-10],[5,14,5],'brick','Right rear brick chimney, not a solid pale column.'],
 ['plinth','meso','building',[-20,0,-16],[40,2,32],'stone','Low connected stone foundation.'],
 ['lower-wall','meso','building',[-20,2,-16],[40,15,32],'sage','Sage plaster at lower floor with sparse grouped stone repairs.'],
 ['upper-wall','meso','building',[-20,18,-16],[40,15,32],'cream','Cream upper floor with warm corner patches and actual openings.'],
 ['floor-band','meso','building',[-20,17,-16],[40,1,32],'stone','Pale horizontal belt at floor division.'],
 ['gable','meso','building',[-20,33,-16],[40,14,32],'cream','Right stepped triangular gable closes directly under the roof.'],
 ['front-low','meso','lower-wall',[-15,5,14],[10,11,4],'glass','Lower left window, uninterrupted inset opaque blue-green glass.'],
 ['front-upper-left','meso','upper-wall',[-15,22,14],[10,10,4],'glass','Upper left window with perimeter frame only.'],
 ['front-upper-right','meso','upper-wall',[4,22,14],[10,10,4],'glass','Upper right window, same scale as upper left.'],
 ['right-low','meso','lower-wall',[18,5,-4],[4,11,10],'glass','Side ground-floor window with ivory sill.'],
 ['right-upper','meso','upper-wall',[18,22,-4],[4,10,10],'glass','Side upper-floor window above lower opening.'],
 ['door','meso','lower-wall',[4,2,14],[10,14,4],'wood','Recessed timber door on the right; no shutters.'],
 ['porch','meso','lower-wall',[2,17,15],[14,4,8],'slate','Small blue lean-to porch, attached at wall, clear above doorway.'],
 ['steps','meso','plinth',[3,0,16],[12,2,10],'stone','Two shallow connected steps; direct clear approach.'],
 ['rail-left','micro','front-upper-left',[-16,21,16],[12,4,4],'rail','Dark upper window guard with open slots and two wall-return brackets.'],
 ['rail-right','micro','front-upper-right',[3,21,16],[12,4,4],'rail','Second upper window guard; both stay below upper half of glass.'],
 ['rail-side','micro','right-upper',[19,21,-5],[4,4,12],'rail','Side window guard; brackets connect to the side wall.'],
 ['ridge','micro','roof',[-23,48,-2],[46,1,4],'slate','Low continuous ridge with small grouped tile color differences.'],
 ['chimney-cap','micro','chimney',[11,52,-11],[7,2,7],'stone','Pale projecting rim with a true upward opening.'],
 ['door-handle','micro','door',[12,8,17],[1,1,1],'metal','Small handle on right side of timber door.'],
];
spec.sourceImage='../../references/crops/home.png';spec.suitability='conditional';
spec.referenceCamera={solved:false,projection:'orthographic',aspect:354/423,positionHint:[12.2,10,30],orientation:{yaw:22.1,pitch:17.1,roll:0},note:'Manual estimate from observed horizontal edge slopes; back and left are inferred.'};
spec.preSpecAssessment.objectClass={primaryType:'two-storey woodland dwelling',primaryDomain:'object',formLanguage:['architectural','rectilinear','voxel'],structureKind:['layered shell','repeated tile courses'],motionPotential:['construction','component inspection'],materialFamilies:['plaster','stone','slate','wood','opaque glass','brick'],notes:'Exact approved town crop; 15cm sharp editable cells; no centre mullions, no shutters. Not a recovered physical material.'};
Object.assign(spec.preSpecAssessment.complexity,{scores:{silhouetteComplexity:2,componentCount:3,hierarchyDepth:2,repetitionDensity:2,materialLayerCount:2,localDetailDensity:2,occlusionRisk:2,actionReadinessNeed:1},estimatedCounts:{macroComponents:3,mesoComponents:13,microFeatureGroups:6,materialLayers:8,repetitionSystems:2},reasoning:['Specific two-storey facade, five windows, three guards, closed tiled roof and hollow chimney need independent specification.']});
spec.preSpecAssessment.unknownsToResolveBeforeImplementation=['Rear and left facades are unseen: plain closed plaster walls are an explicit inference.','Surface response approximated procedurally; no exact PBR recovery claim.','Garden and surrounding street excluded from this building-only comparison.'];
spec.componentTree=defs.map(([id,level,parent,pos,size,material,description])=>{
 const c=structuredClone(base);Object.assign(c,{id,name:id,level,role:id,parent,importance:level==='macro'?1:.8,confidence:.78,material,materialLayers:[material],topologyClass:'assembled-solid',topologyRationale:'Axis-aligned occupied 15cm cubes; openings and tile contacts are authored as a connected cell union.',dimensions:{width:size[0]*.15,height:size[1]*.15,depth:size[2]*.15,units:'metres',confidence:.7},transform:{position:pos.map(n=>n*.15),rotation:[0,0,0],scale:[1,1,1]},localFeatures:[{id:id+'-identity',type:'geometry',description,evidenceRefs:['home-crop']}],evidenceRefs:['home-crop'],details:[description]});
 c.geometryDescriptor={topologyIntent:'Uniform editable cube grid; visible face extraction, no fractional geometry.',edgeTreatment:{type:'none',bevelRadius:0,segments:1},deformationStack:[],uvStrategy:'world-space independent procedural material, no photographic projection',normalStrategy:'axis-aligned normals',parameters:{pos,size}};
 c.actionProfile.animationRole='construction component';c.actionProfile.sockets=[{id:id,position:[0,0,0],rotation:[0,0,0]}];c.actionProfile.collider.notes='Occupied cells are collision authority; bounding box is inspection proxy only.';
 c.attachment=parent?{parentSocket:parent,localStart:pos.map(n=>n*.15),localEnd:pos.map(n=>n*.15),contactType:'voxel union',embedDepth:.15,overlap:.15,gapTolerance:0,notes:'Authoring volumes overlap or share occupied faces. Union removes internal geometry. Contact verified on final cells.'}:null;
 return c;
});
spec.materials=Object.entries({cream:'#e6d6b1',sage:'#8b9e71',stone:'#cfc7a5',slate:'#426173',brick:'#ac6840',wood:'#927040',rail:'#504c3f',glass:'#426965',metal:'#8d713a'}).map(([id,color])=>{
 const m=structuredClone(matBase);Object.assign(m,{id,name:id,color,baseColor:color,albedo:{dominant:color,secondary:[],samplingNotes:'Agent-observed palette from home.png; independent from baked highlights.'},notes:'Stylized material approximation; reference PBR maps are not inferred.',localOverrides:[{id:id+'-locality',region:id,description:id==='glass'?'Uninterrupted pane with restrained upper/lower color zones.':'Grouped cell colors; subtle independent roughness and fine normal variation.',evidenceRefs:['home-crop']}],roughness:{base:id==='glass'?.32:.88,variation:.03,map:'independent procedural field'},normal:{pattern:'procedural independent fine noise',strength:.025,scale:35,space:'object'},displacement:{pattern:'none',amplitude:0,scale:1,silhouetteAffects:false}});return m;
});
spec.preSpecAssessment.detailInventory.details=defs.slice(3).map(([id,,,,,,description])=>({id:id+'-identity',name:description,kind:'ridge',zone:id,importance:'important',componentRef:id,localFeatureRef:id+'-identity',mapsTo:{ref:id+'-identity'},evidenceRefs:['home-crop'],observed:true}));
spec.viewEvidence=[{id:'home-crop',view:'primary',imageRegion:{x:0,y:0,width:1,height:1,units:'normalized'},observations:defs.map(d=>d[6]),confidence:.8}];
spec.qualityContract.definitionOfDone=['Independent 15cm editable reconstruction of the exact home crop. Match the two-storey silhouette, gabled roof, openings and palette; keep upper window guards but remove mullions and shutters as user requested.','No detached components, roof holes, inaccessible doorway, fractional block scales or missing faces. Keep inference and unmeasured iPhone performance explicit.'];
spec.repetitionSystems=[{id:'tiles',componentRef:'roof',type:'grid',count:240,distribution:'12 narrow lanes, 10 short courses on each slope; grouped colors and closed deck',parameters:{laneWidth:4,courseDepth:2},evidenceRefs:['home-crop']},{id:'guards',componentRef:'rail-left',type:'linear',count:3,distribution:'Three window guards with side-return brackets, not full balconies',evidenceRefs:['home-crop']}];
spec.featureReviewTargets=[['mass','Two-storey proportions and visible side depth',['blockout','structural-pass','form-refinement']],['roof-system','Gable, eaves, ridge and chimney position',['blockout','structural-pass','form-refinement']],['facade','Five inset windows, three guards, right doorway and attached porch',['structural-pass','form-refinement']],['palette','Sage lower wall, cream upper wall and blue-grey tiles',['material-pass','surface-pass','lighting-pass']]].map(([id,name,passes])=>({id,name,tier:'critical',minimumScore:.7,mustPass:true,componentRefs:id==='roof-system'?['roof','chimney']:id==='facade'?['front-low','rail-left','porch']:['building'],passIds:passes,evidenceRefs:['home-crop'],criteria:[name]}));
for(const pass of spec.buildPasses)pass.componentRefs=pass.id==='blockout'?['building','roof','chimney']:defs.map(d=>d[0]);
spec.qualityTargets.reviewViewpoints=['match','front','right','back','left'];
spec.assumptions=['Reference central mullions intentionally omitted by user instruction.','Visible cube sizes may differ in generated reference; reconstruction uses strictly 15cm cells.','No exact PBR or unseen interior reconstruction.'];
spec.assumptions.push(...spec.preSpecAssessment.unknownsToResolveBeforeImplementation);spec.preSpecAssessment.unknownsToResolveBeforeImplementation=[];
spec.lookDevTargets.materialPass.referencePbrExtraction={requiredWhenSourceImagePresent:false,acceptedLimitation:'Project uses editable 15cm sharp voxels with procedural surfaces, as accepted in cafe roof13. No photographic projection or exact PBR recovery; source appearance remains comparison evidence.'};
spec.lightingFromPhoto=['Warm key from upper left/front at (-9,16,14), intensity 3.15; cool hemisphere fill 1.05.','ACES tone mapping exposure 1, cream background and real PCF contact shadows.','Neutral and low grazing light variants are tested separately; environment is procedural.'];
const rgba=hex=>'rgba('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+', 1)';for(const c of spec.componentTree){const m=spec.materials.find(m=>m.id===c.material);c.colorMaterialRecipe={dominantAlbedo:rgba(m.baseColor),secondaryAlbedo:rgba(m.baseColor),materialClass:['wood','rail'].includes(c.material)?'wood':c.material==='glass'?'glass':c.material==='metal'?'metal':'stone',materialClassConfidence:.7};}
spec.performanceBudget={targetTriangles:35000,targetDrawCalls:30,targetFPS:60,notes:'Targets only; actual phone performance must be measured after integration.'};
spec.proceduralStrategy=['Individually authored integer occupancy, independent of cafe geometry.','Mesh exterior faces grouped by construction part; per-cell source material identity.'];
spec.localSpecSearch=assessment.localSpecSearch||spec.localSpecSearch;
assessment.preSpecAssessment=spec.preSpecAssessment;assessment.qualityContract=spec.qualityContract;
fs.writeFileSync(new URL('./sculpt-spec.json',import.meta.url),JSON.stringify(spec,null,2)+'\n');fs.writeFileSync(new URL('./assessment.json',import.meta.url),JSON.stringify(assessment,null,2)+'\n');
