import fs from 'node:fs';
const file=new URL('./sculpt-spec.json',import.meta.url),spec=JSON.parse(fs.readFileSync(file));
if(spec.reviewHistory?.length)throw Error('Do not overwrite reviews.');
const component=spec.componentTree[0],material=spec.materials[0];
const defs=[
 ['building','macro',null,[-20,1,-14],[40,23,28],'masonry','Blue-grey rectangular stone shell with varied ashlar courses and pale corner blocks.'],
 ['roof','macro','building',[-23,25,-17],[46,16,34],'tile','Four-sided hip roof, short plateau, eight closed stepped courses; muted plum slate with isolated pale tiles.'],
 ['bench','macro',null,[23,0,-4],[7,11,19],'wood','Side bench with backrest and four ground-reaching legs; longitudinal direction Z, outside door route.'],
 ['plinth','meso',null,[-20,0,-14],[40,2,28],'stone','Single ground datum; pale continuous foundation below walls.'],
 ['fascia','meso','building',[-21,23,-15],[42,2,30],'stone','Pale eave band and attached corner corbels, covered by roof perimeter.'],
 ['chimney','meso','roof',[7,33,-10],[5,13,5],'stone','Pale chimney rising from rear roof; connected base and an open flue.'],
 ['chimney-rim','micro','chimney',[6,44,-11],[7,2,7],'tile','Projecting dark plum rim around an actual opening, no solid cap.'],
 ['display-frame','meso','building',[-16,5,13],[18,13,2],'wood','Recessed broad shop window perimeter; no vertical central mullions.'],
 ['display-glass','meso','display-frame',[-15,6,12],[16,11,1],'glass','Deep teal background pane behind two rows of book spines.'],
 ['display-sill','meso','building',[-17,3,14],[20,2,3],'stone','Projected pale stone sill supports the shop window frame.'],
 ['display-lintel','meso','building',[-17,18,14],[20,2,3],'stone','Pale stone lintel above the window, inset from roof edge.'],
 ['books-lower','micro','display-frame',[-15,6,13],[16,4,1],'paper','Unequal upright book spines, cream pages, muted sage and ochre covers; supported by frame.'],
 ['books-upper','micro','display-frame',[-15,12,13],[16,4,1],'paper','Second row of shorter book spines above a real horizontal shelf.'],
 ['shelf','micro','display-frame',[-15,11,13],[16,1,2],'wood','Horizontal timber shelf joins the perimeter; deliberately no vertical dividers.'],
 ['door','meso','building',[7,2,13],[8,17,1],'wood','Right-hand wood door with a single upper teal glazed panel and no centre bar.'],
 ['door-frame','meso','building',[6,2,14],[10,18,1],'wood','Attached wood jambs around a clear door recess.'],
 ['door-glass','micro','door',[8,11,13],[6,6,1],'glass','Uninterrupted single upper door pane.'],
 ['door-lintel','meso','building',[5,20,14],[12,2,3],'stone','Shallow stone hood over entry, entirely above the door.'],
 ['handle','micro','door',[13,9,14],[1,1,1],'metal','One-cell warm brass handle attached to door.'],
 ['side-window','meso','building',[19,7,-3],[2,13,6],'glass','Narrow right-side wood-bordered glazed opening with a pale lintel and sill.'],
 ['steps','meso','plinth',[5,0,14],[12,2,8],'stone','Two low entry steps with unobstructed approach.'],
 ['pot-left','meso',null,[-25,0,16],[5,4,5],'pot','Low terracotta pot adjacent to left shop wall, grounded.'],
 ['pot-right','meso',null,[18,0,18],[5,4,5],'pot','Second small grounded terracotta pot outside the door path.'],
 ['herb-left','micro','pot-left',[-24,3,17],[3,5,3],'leaf','Three distinct connected upright leaf stems rooted in pot.'],
 ['herb-right','micro','pot-right',[19,3,19],[3,6,3],'leaf','Unequal leaves connected to soil, away from door.'],
 ['lamp-post','meso',null,[32,0,7],[3,17,3],'wood','Slender square streetlight beside bench; base on ground.'],
 ['lamp-head','micro','lamp-post',[31,16,6],[5,7,5],'lamp','Ivory lantern with dark plum cap, attached to post.'],
];
const colors={masonry:'#627985',tile:'#6d626c',stone:'#d8ceb1',wood:'#936637',glass:'#426b63',paper:'#c4ab7a',leaf:'#708b47',pot:'#a77046',metal:'#8b794d',lamp:'#e6d9a9'};
spec.sourceImage='../../references/crops/books.png';spec.suitability='conditional';
spec.referenceCamera={solved:false,projection:'orthographic',aspect:396/374,positionHint:[12.5,10,30],note:'Estimated from front and side eave slopes, not calibrated.'};
spec.coordinateFrame={front:'+Z',up:'+Y',scaleReference:'Uniform editable 0.15m cubes. Inferred dimensions.'};
Object.assign(spec.preSpecAssessment,{objectClass:{primaryType:'one-storey stone bookshop',primaryDomain:'object',formLanguage:['architectural','voxel'],structureKind:['masonry shell','hip roof','display shelves','grounded furniture'],motionPotential:['construction','part inspection'],materialFamilies:Object.keys(colors),notes:'Observed approved crop, not generic shop template.'},unknownsToResolveBeforeImplementation:[]});
Object.assign(spec.preSpecAssessment.complexity,{scores:{silhouetteComplexity:2,componentCount:3,hierarchyDepth:2,repetitionDensity:2,materialLayerCount:3,localDetailDensity:2,occlusionRisk:2,actionReadinessNeed:1},estimatedCounts:{macroComponents:3,mesoComponents:16,microFeatureGroups:8,materialLayers:10,repetitionSystems:3},reasoning:['Hipped stepped roof, blue stone masonry, two rows of individual books and side furniture.']});
spec.componentTree=defs.map(([id,level,parent,pos,size,mat,description])=>{
 const c=structuredClone(component);Object.assign(c,{id,name:id,level,parent,role:id,importance:level==='macro'?1:.8,confidence:.78,material:mat,materialLayers:[mat],topologyClass:'assembled-solid',topologyRationale:'Connected union of uniform axis-aligned cells; contour tailored to observed part.',dimensions:{width:size[0]*.15,height:size[1]*.15,depth:size[2]*.15,units:'metres',confidence:.7},transform:{position:pos.map(n=>n*.15),rotation:[0,0,0],scale:[1,1,1]},localFeatures:[{id:id+'-identity',type:'geometry',description,evidenceRefs:['books-crop']}],details:[description],evidenceRefs:['books-crop']});
 c.geometryDescriptor={topologyIntent:'Integer occupancy with exact exposed surfaces and no hollow seams.',edgeTreatment:{type:'none',bevelRadius:0,segments:1},deformationStack:[],uvStrategy:'object-space independent procedural fields',normalStrategy:'axis normals with lighting-only microrelief',parameters:{pos,size}};
 c.actionProfile.animationRole='construction component';c.actionProfile.sockets=[{id,position:[0,0,0],rotation:[0,0,0]}];c.actionProfile.collider.notes='Occupancy authoritative; bounding boxes are inspection proxies.';
 c.attachment=parent?{parentSocket:parent,localStart:pos.map(n=>n*.15),localEnd:pos.map(n=>n*.15),contactType:'voxel union',embedDepth:.15,overlap:.15,gapTolerance:0,notes:'Single final owner per voxel. Actual boundary support and root connectivity checked separately.'}:null;
 c.surfaceDetail={macroRoughness:mat==='glass'?.28:.88,microRoughness:.06,bumpAmplitude:.0008,normalPattern:'Independent material-local derivative normal',displacementPattern:'none',occlusionPattern:'Neighbour occupancy plus actual shadows',notes:'No deformation, uniform editing size.'};
 const hex=colors[mat],rgba='rgba('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+', 1)';c.colorMaterialRecipe={dominantAlbedo:rgba,secondaryAlbedo:rgba,materialClass:mat==='glass'?'glass':mat==='metal'?'metal':mat==='wood'?'wood':'stone',materialClassConfidence:.7};return c;
});
spec.materials=Object.entries(colors).map(([id,color])=>Object.assign(structuredClone(material),{id,name:id,color,baseColor:color,albedo:{dominant:color,secondary:[],samplingNotes:'Observed hue/value relationships, not recovered reflectance.'},roughness:{base:id==='glass'?.28:.86,variation:.06,map:'independent material noise'},normal:{pattern:'independent object-space relief',strength:.025,scale:35,space:'object'},displacement:{pattern:'none',amplitude:0,scale:1,silhouetteAffects:false},localOverrides:[{id:id+'-variation',region:id,description:id==='masonry'?'Blue-grey courses mixed with a few sandstone blocks.':id==='tile'?'Plum-grey grouped tiles and sparse pale repairs.':id==='paper'?'Sage, ochre and cream spines on two shelves.':'Part-directed color grouping and material response.',evidenceRefs:['books-crop']}],notes:'Stylized material approximation.'}));
spec.preSpecAssessment.detailInventory.details=defs.slice(3).map(([id,,,,,,name])=>({id:id+'-identity',name,kind:'ridge',zone:id,importance:'important',componentRef:id,localFeatureRef:id+'-identity',mapsTo:{ref:id+'-identity'},evidenceRefs:['books-crop'],observed:true}));
spec.qualityContract.definitionOfDone=['Independently rebuild the approved bookshop crop: plum-grey hipped roof, blue masonry, two rows of recognizable books, right door and side bench.','All 15cm cells grounded and joined, no centre window bars, clear entry, attached supported props. Compare source, four sides and small display.'];
spec.repetitionSystems=[{id:'hip-courses',componentRef:'roof',type:'grid',count:64,distribution:'Eight closed rings, 2+2+1 color grouping follows each roof slope.',evidenceRefs:['books-crop']},{id:'masonry-courses',componentRef:'building',type:'grid',count:200,distribution:'Offset grouped 4x2 cell stone courses; sparse sandy blocks, no speckle noise.',evidenceRefs:['books-crop']},{id:'book-spines',componentRef:'books-lower',type:'linear',count:12,distribution:'Unequal upright books on two grounded shelves, restrained alternating hues.',evidenceRefs:['books-crop']}];
spec.featureReviewTargets=[['mass','Rectangular low shop and hip roof',['blockout','structural-pass','form-refinement'],['building','roof']],['roof','Stepped plum-grey four-slope roof and chimney',['blockout','structural-pass','form-refinement'],['roof','chimney']],['display','Wide two-row book display, right door and side bench',['structural-pass','form-refinement'],['display-frame','books-lower','door','bench']],['palette','Cool blue masonry, muted plum roof, pale frames and warm wood',['material-pass','surface-pass','lighting-pass'],['building','roof','display-lintel','bench']]].map(([id,name,passIds,componentRefs])=>({id,name,tier:'critical',mustPass:true,minimumScore:.7,passIds,componentRefs,evidenceRefs:['books-crop'],criteria:[name]}));
spec.viewEvidence=[{id:'books-crop',view:'primary',imageRegion:{x:0,y:0,width:1,height:1,units:'normalized'},observations:defs.map(d=>d[6]),confidence:.8}];
for(const pass of spec.buildPasses)pass.componentRefs=pass.id==='blockout'?['building','roof','bench']:defs.map(d=>d[0]);
spec.qualityTargets.reviewViewpoints=['match','front','right','back','left'];
spec.lookDevTargets.materialPass.referencePbrExtraction={requiredWhenSourceImagePresent:false,acceptedLimitation:'Established user-selected editable 15cm voxel/procedural finish route; no recovered PBR or projected source art.'};
spec.performanceBudget={targetTriangles:40000,targetDrawCalls:35,targetFPS:60,notes:'Targets only, iPhone unmeasured.'};
spec.lightingFromPhoto=['Warm key from upper left/front at (-9,18,14), intensity 3.0; cool hemisphere fill 1.35 and directional fill .68.','ACES tone mapping exposure 1, cream background and real PCF contact shadows on ground.','Neutral and low grazing light variants, procedural environment intensity .28.'];
spec.proceduralStrategy=['Independent bookshop occupancy from its actual crop; reusable mesher and shader infrastructure only.','Named parts, construction phases, pivots and occupancy-safe serialization.'];
spec.assumptions=['Back, left and internal details inferred as plain closed masonry.','Source softened corners approximated by uniform sharp editable cells.','Diagnostic polygon excludes background vegetation without modifying source RGB.','Window centre bars removed under prior user direction. Books form a recessed stylized display without transmissive refraction.','Small flue opening replaces ambiguous solid cap.'];
fs.writeFileSync(file,JSON.stringify(spec,null,2)+'\n');
const ap=new URL('./assessment.json',import.meta.url),a=JSON.parse(fs.readFileSync(ap));a.preSpecAssessment=spec.preSpecAssessment;a.qualityContract=spec.qualityContract;fs.writeFileSync(ap,JSON.stringify(a,null,2)+'\n');
