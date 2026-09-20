import * as THREE from 'three';

export const ACTORS={person:'人',cat:'猫',dog:'犬',bird:'野鳥',butterfly:'蝶',bee:'蜂',horse:'馬',camel:'ラクダ',sheep:'羊',goat:'ヤギ',reindeer:'トナカイ',turtle:'ウミガメ',gull:'カモメ',duck:'カモ',pigeon:'ハト',owl:'フクロウ',cart:'手押し車'};
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0});
const FACE=[[[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]],[[-1,0,0],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]],[[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],[[0,0,1],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]],[[0,0,-1],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]]];
const B=(x,y,z,w,h,d,c)=>({x,y,z,w,h,d,c});
function blocks(parts){
  const positions=[],normals=[],colors=[];
  for(const b of parts){const col=new THREE.Color(b.c);for(const [n,q] of FACE){const shade=n[1]>0?1:n[1]<0?.78:n[0]?.9:.96;for(const i of [0,1,2,0,2,3]){const v=q[i];positions.push(b.x+(v[0]-.5)*b.w,b.y+(v[1]-.5)*b.h,b.z+(v[2]-.5)*b.d);normals.push(...n);colors.push(col.r*shade,col.g*shade,col.b*shade);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function part(parent,name,pos,boxes){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);if(boxes.length){const m=new THREE.Mesh(blocks(boxes),material);m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;}
const colorChoice=(seed,list)=>list[Math.abs(Math.floor(seed))%list.length];
const HUMAN_STRIDE=.085;
function walkingFoot(cycle){
  const phase=((cycle/(Math.PI*2))%1+1)%1;
  // The body travels 2 * stride during stance: equal backward travel in
  // body space leaves the planted foot fixed on the ground.
  if(phase<.5)return{z:HUMAN_STRIDE*(1-4*phase),y:.0135};
  const swing=(phase-.5)*2;
  // Match the stance velocity at toe-off and landing. In world space the
  // airborne foot moves forward smoothly and stops at the next contact.
  return{z:HUMAN_STRIDE*(-1-2*swing+12*swing*swing-8*swing*swing*swing),y:.0135+Math.sin(Math.PI*swing)**2*.04};
}
export function makeProp(kind,parent){
  const paper='#eddfba',wood='#a78560';let list=[];
  if(kind==='book')list=[B(0,0,0,.14,.025,.095,'#6b887d'),B(0,.019,0,.126,.017,.083,paper),B(0,.031,0,.008,.008,.086,'#baab8f')];
  if(kind==='cup')list=[B(0,.045,0,.065,.075,.065,paper),B(0,.085,0,.046,.008,.046,'#927559'),B(.044,.045,0,.017,.055,.018,paper),B(.033,.074,0,.034,.015,.018,paper),B(.033,.02,0,.034,.015,.018,paper)];
  if(kind==='can')list=[B(0,.042,0,.085,.08,.065,'#829b8a'),B(0,.092,0,.035,.024,.045,'#829b8a'),B(.065,.06,0,.07,.025,.026,'#829b8a'),B(-.05,.062,0,.012,.075,.022,'#687e71'),B(-.029,.095,0,.05,.014,.022,'#687e71')];
  if(kind==='parcel')list=[B(0,.035,0,.15,.07,.1,'#bb9c71'),B(0,.072,0,.02,.006,.103,paper),B(0,.072,0,.152,.006,.014,paper)];
  if(kind==='basket')list=[B(0,.015,0,.13,.025,.085,wood),B(-.06,.053,0,.017,.065,.085,wood),B(.06,.053,0,.017,.065,.085,wood),B(0,.053,.036,.13,.065,.015,wood),B(0,.053,-.036,.13,.065,.015,wood),B(0,.062,0,.10,.018,.055,'#a5ae77')];
  if(kind==='shovel'){
    list=[B(0,.12,0,.20,.027,.035,wood),B(0,-.394,.255,.24,.044,.16,'#778d94')];
    for(let i=0;i<=20;i++)list.push(B(0,.12-i*.0245,i*.0118,.028,.038,.038,wood));
  }
  if(kind==='firewood')list=[B(-.042,.023,0,.065,.065,.17,wood),B(.032,.023,0,.065,.065,.17,'#9b7450'),B(0,.072,0,.065,.06,.17,'#b99a6e'),B(0,.035,0,.025,.012,.176,'#d8c7a3')];
  return part(parent,kind||'empty',[0,0,0],list);
}
function makeHuman(seed,item,appearance={}){
  const child=appearance.age==='child',gender=appearance.gender|| (seed%2?'woman':'man'),size=child?.72:1,hairStyle=appearance.hairStyle||(gender==='woman'?'bob':'short');
  const root=new THREE.Group(),skin=appearance.skin||colorChoice(seed,['#cfac89','#af8465','#e1c3a0','#bd9774']),shirt=appearance.shirt||colorChoice(seed>>2,['#88a199','#ad9582','#929e79','#98a6b5']),hair=appearance.hair||colorChoice(seed>>3,['#635545','#82725d','#514d44']),pants=appearance.pants||'#69736b',shoe=appearance.shoe||'#615c50',trim=appearance.trim||'#cfbfa0';
  root.scale.setScalar(size);root.userData.person={gender,age:child?'child':'adult',role:appearance.role||'resident'};
  const hips=part(root,'hips',[0,.4485,0],[B(0,0,0,.17,.065,.115,pants)]);
  const torso=part(hips,'torso',[0,.11,0],[B(0,0,0,.19,.21,.12,shirt),B(0,.1,0,.135,.025,.11,shirt),B(0,.115,0,.07,.035,.07,skin),...(appearance.apron===false?[]:[B(0,-.015,.064,.115,.16,.013,trim),B(0,.075,.067,.028,.025,.012,'#e6dcc4')])]);
  if(appearance.coat)part(torso,'coat',[0,-.085,0],[B(0,0,-.017,.213,.13,.144,shirt),B(0,.105,.070,.013,.19,.014,trim),B(-.058,.005,.075,.05,.045,.018,trim),B(.058,.005,.075,.05,.045,.018,trim)]);
  if(appearance.overalls)part(torso,'overalls',[0,0,0],[B(0,-.025,.068,.14,.165,.016,pants),B(-.052,.086,.070,.026,.07,.018,pants),B(.052,.086,.070,.026,.07,.018,pants)]);
  if(appearance.tie)part(torso,'shirt-and-tie',[0,0,0],[B(0,.055,.066,.105,.1,.012,'#e3dfd3'),B(0,.003,.079,.021,.155,.017,trim)]);
  if(appearance.backpack)part(torso,'backpack',[0,.015,-.095],[B(0,0,0,.15,.18,.08,trim),B(0,.058,-.047,.12,.046,.016,shirt),B(-.064,.072,.07,.017,.12,.02,trim),B(.064,.072,.07,.017,.12,.02,trim)]);
  if(appearance.scarf)part(torso,'scarf',[0,.106,.018],[B(0,0,0,.15,.055,.13,trim),B(.048,-.067,.065,.045,.11,.024,trim)]);
  if(appearance.collar)part(torso,'collar',[0,.087,.069],[B(-.032,0,0,.049,.04,.017,trim),B(.032,0,0,.049,.04,.017,trim)]);
  if(appearance.cardigan)part(torso,'cardigan',[0,0,0],[B(-.073,-.008,.066,.045,.18,.016,shirt),B(.073,-.008,.066,.045,.18,.016,shirt),B(0,-.011,.067,.095,.17,.014,trim),...[-.065,-.025,.015].map(y=>B(.018,y,.08,.013,.013,.01,shirt))]);
  if(appearance.vest)part(torso,'vest',[0,0,.069],[B(-.061,-.015,0,.052,.165,.024,pants),B(.061,-.015,0,.052,.165,.024,pants),B(0,-.088,0,.145,.03,.024,pants)]);
  const head=part(hips,'head',[0,.305,0],[B(0,0,0,.145,.165,.135,skin),B(0,.08,-.013,.157,.045,.142,hair),B(0,.018,-.068,.15,.12,.022,hair),B(-.079,-.006,0,.025,.045,.04,skin),B(.079,-.006,0,.025,.045,.04,skin),B(-.036,.004,.07,.016,.018,.008,'#55554b'),B(.036,.004,.07,.016,.018,.008,'#55554b'),B(0,-.022,.078,.024,.025,.028,skin)]);
  if(child)head.scale.setScalar(1.14);
  if(hairStyle==='bob')part(head,'bob',[0,0,0],[B(-.077,-.026,-.012,.026,.155,.119,hair),B(.077,-.026,-.012,.026,.155,.119,hair),B(0,-.054,-.077,.154,.09,.026,hair),B(-.03,.063,.068,.086,.043,.023,hair)]);
  if(hairStyle==='ponytail')part(head,'ponytail',[0,.025,-.078],[B(0,0,-.015,.086,.06,.065,hair),B(0,-.064,-.04,.062,.11,.049,hair),B(0,-.005,-.032,.078,.016,.062,trim)]);
  if(hairStyle==='pigtails')for(const s of [-1,1])part(head,'pigtail',[s*.085,-.016,-.032],[B(s*.015,-.013,0,.046,.09,.05,hair),B(s*.015,.02,0,.051,.018,.055,trim)]);
  if(hairStyle==='sidepart')part(head,'side-part',[-.04,.066,.055],[B(0,0,0,.083,.052,.04,hair)]);
  const hat=appearance.hat===undefined?(seed%3===0?'cap':null):appearance.hat;
  if(hat==='cap')part(head,'cap',[0,.082,0],[B(0,.014,0,.18,.04,.16,appearance.hatColor||shirt),B(0,0,.07,.18,.016,.12,appearance.hatColor||shirt)]);
  if(hat==='baker')part(head,'baker-cap',[0,.083,0],[B(0,.01,0,.175,.035,.162,'#eae2ce'),B(0,.05,-.008,.19,.055,.17,'#eee8d9')]);
  if(hat==='knit')part(head,'knit-hat',[0,.082,0],[B(0,.01,0,.177,.045,.164,trim),B(0,.045,0,.153,.045,.145,trim),B(0,.073,0,.10,.023,.10,trim)]);
  if(hat==='sun')part(head,'sun-hat',[0,.089,0],[B(0,0,0,.255,.022,.245,trim),B(0,.035,0,.164,.058,.16,trim),B(0,.014,0,.173,.022,.168,shirt)]);
  const legs=[-1,1].map(s=>{const upper=part(hips,'thigh',[s*.055,-.005,0],[B(0,-.108,0,.073,.215,.078,pants)]),lower=part(upper,'shin',[0,-.215,0],[B(0,0,0,.068,.05,.073,appearance.shorts?skin:pants),B(0,-.102,0,.064,.205,.07,appearance.shorts?skin:pants),...(appearance.boots?[B(0,-.145,.006,.078,.133,.092,shoe)]:[])]),foot=part(lower,'foot',[0,-.215,0],[B(0,.009,.027,.078,.045,.135,shoe),...(appearance.sandals?[B(0,.034,.021,.069,.014,.046,skin)]:[])]);return{upper,lower,foot};});
  if(appearance.skirt){part(hips,'waistband',[0,.012,0],[B(0,0,.004,.18,.028,.133,pants)]);for(const l of legs)part(l.upper,'skirt-panel',[0,-.073,0],[B(0,0,.008,.112,.153,.115,pants)]);}
  const arms=[-1,1].map(s=>{const upper=part(hips,'upper-arm',[s*.124,.187,0],[B(0,-.067,0,.063,.135,.074,shirt)]),lower=part(upper,'forearm',[0,-.135,0],[B(0,-.058,0,appearance.longSleeves?.059:.049,.116,.054,appearance.longSleeves?shirt:skin)]),hand=part(lower,'hand',[0,-.12,0],[B(0,-.012,0,.05,.05,.052,appearance.gloves?trim:skin)]);return{upper,lower,hand};});
  const carry=part(hips,'held-object',[0,.07,.145],[]),prop=makeProp(item,carry);carry.visible=!!item;
  function ik(leg,hipY,z,y){
    const dy=hipY-.005-y,len=.215,r=Math.min(.429,Math.hypot(dy,z)),aim=Math.atan2(z,dy),bend=Math.acos(Math.min(1,r/(2*len)));
    leg.upper.rotation.x=-aim-bend;leg.lower.rotation.x=2*bend;leg.foot.rotation.x=aim-bend;
  }
  function reach(arm,target,side){
    const start=arm.upper.position.clone(),v=new THREE.Vector3(...target).sub(start),distance=Math.min(.254,v.length()),axis=v.normalize(),l1=.135,l2=.12;
    const bend=new THREE.Vector3(side*.6,-.3,.4).addScaledVector(axis,-new THREE.Vector3(side*.6,-.3,.4).dot(axis)).normalize(),c=Math.max(-1,Math.min(1,(l1*l1+distance*distance-l2*l2)/(2*l1*distance))),elbow=start.clone().addScaledVector(axis,l1*c).addScaledVector(bend,l1*Math.sqrt(1-c*c));
    arm.upper.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),elbow.clone().sub(start).normalize());
    const fore=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(...target).sub(elbow).normalize());
    arm.lower.quaternion.copy(arm.upper.quaternion).invert().multiply(fore);arm.hand.quaternion.copy(fore).invert();
  }
  function pose(t,{moving=false,distance=0,action='idle',seatHeight=null,seatBlend=1}={}){
    const seated=seatHeight!==null,standing=moving?.425:.4485,blend=seated?seatBlend:0,supportOffset=appearance.skirt?.065:.044,hipY=standing+(seated?seatHeight/size+supportOffset-standing:0)*blend;hips.position.y=hipY;head.rotation.y=Math.sin(t*.6+seed)*.055;head.rotation.x=['read','work','water','care','shovel'].includes(action)?.14:action==='observe'?-.22:0;
    const cycle=distance/size*Math.PI/(2*HUMAN_STRIDE);
    legs.forEach((l,i)=>{const ph=cycle+i*Math.PI,foot=moving?walkingFoot(ph):{z:0,y:.0135};ik(l,hipY,foot.z,foot.y);
      if(seated){
        // Thighs rest on the seat; knees stay at its front edge. A short
        // child's feet can hang naturally instead of stretching the shins.
        const lean=-Math.acos(Math.max(0,Math.min(1,(hipY-.005-.0135)/.215)));
        l.upper.rotation.x+=( -Math.PI/2-l.upper.rotation.x)*blend;
        l.lower.rotation.x+=(Math.PI/2+lean-l.lower.rotation.x)*blend;
        l.foot.rotation.x=-l.upper.rotation.x-l.lower.rotation.x;
      }
    });
    arms.forEach((a,i)=>{a.upper.rotation.set(moving?Math.cos(cycle+i*Math.PI)*.23:Math.sin(t*.7+i)*.035,0,0);a.lower.rotation.set(0,0,0);a.hand.rotation.set(0,0,0);});
    carry.rotation.set(action==='water'?-.28+Math.sin(t*1.8)*.12:action==='read'?.12:0,0,0);carry.position.set(item==='can'?.14:item==='cup'?.09:0,item==='can'?-.02:item==='cup'?0:.01,.18);carry.visible=!!item&&action!=='idle';
    if(item==='shovel'){carry.position.set(0,action==='shovel'?-.025+.022*(1+Math.sin(t*1.6)):.085,.16+(action==='shovel'?Math.sin(t*1.6)*.035:0));}
    if(action==='care'&&item==='basket'){carry.position.y=.09;carry.rotation.x=.12+Math.sin(t*1.1)*.045;}
    if(item==='can'&&appearance.regional){carry.rotation.set(action==='water'?.28+Math.sin(t*1.8)*.12:0,-Math.PI/2,0);carry.position.set(.035,-.02,.18);}
    if(action==='serve')carry.rotation.y=Math.sin(t*.6)*.06;
    if(carry.visible){for(const [i,a] of arms.entries()){if(i===0&&['cup','can'].includes(item))continue;const side=i?1:-1,grip=new THREE.Vector3(item==='can'?-.05:item==='cup'?.01:side*.074,item==='can'?.08:item==='cup'?.035:item==='shovel'?.12:.02,0).applyQuaternion(carry.quaternion).add(carry.position);reach(a,grip.toArray(),side);}}
    if(action==='push'){arms.forEach((a,i)=>reach(a,[(i?1:-1)*.135,.44-hipY,.18],i?1:-1));}
    return{feet:legs.map(l=>l.foot.getWorldPosition(new THREE.Vector3()).toArray()),height:.83};
  }
  pose(0);return{root,pose,hips,head,legs,arms,carry,prop,appearance,body:{radius:.15*size,height:(appearance.hat?.94:.88)*size},type:'person'};
}
const animals={
  cat:{length:.30,width:.145,leg:.095,body:.14,head:.14,neck:.045,coat:'#b7a28a',dark:'#796f5e'},
  dog:{length:.38,width:.17,leg:.15,body:.18,head:.135,neck:.08,coat:'#c0a67b',dark:'#856b52'},
  sheep:{length:.46,width:.29,leg:.19,body:.28,head:.145,neck:.055,coat:'#e0d7bc',dark:'#746d5c'},
  horse:{length:.64,width:.27,leg:.38,body:.30,head:.18,neck:.23,coat:'#a48163',dark:'#594e42'},
  reindeer:{length:.59,width:.28,leg:.34,body:.30,head:.17,neck:.19,coat:'#a89a80',dark:'#615d50'},
  goat:{length:.44,width:.22,leg:.24,body:.22,head:.13,neck:.10,coat:'#d1c5aa',dark:'#7d7767'},
};
function makeAnimal(type,seed){
  const p=animals[type],root=new THREE.Group(),large=['horse','reindeer'].includes(type),y=p.leg+p.body*.52,coat=p.coat,dark=p.dark;
  const body=part(root,'body',[0,y,0],[B(0,0,0,p.width,p.body*.78,p.length,coat),B(0,.035,0,p.width*.86,p.body,p.length*.86,coat),B(0,-.055,0,p.width*.77,p.body*.68,p.length*.9,type==='cat'?'#dbccb1':coat)]);
  if(type==='cat')for(const z of [-.11,-.04,.04])part(body,'stripe',[0,.058,z],[B(0,0,0,p.width*.89,.022,.032,dark)]);
  if(type==='sheep'){const wool=[];for(const x of [-1,0,1])for(const z of [-1,0,1])wool.push(B(x*.09,.10,z*.135,.11,.10,.135,x===0?'#e8dfc9':'#d4cbb4'));part(body,'wool',[0,0,0],wool);}
  const neck=part(root,'neck',[0,y+p.body*.17,p.length*.36],[B(0,p.neck*.48,.018,p.head*.73,p.neck+.075,p.head*.72,coat)]);
  if(large){neck.rotation.x=.18;part(neck,'mane',[0,p.neck*.56,-.048],[B(0,0,0,.055,p.neck+.08,.04,dark)]);}
  const muzzle=type==='cat'?.045:large?p.head*.82:p.head*.65,front=type==='cat'?.066:large?p.head*1.1:p.head*.94;
  const head=part(neck,'head',[0,p.neck+.01,p.head*.16],[B(0,.006,.008,p.head*.85,p.head*.83,p.head,coat),B(0,-p.head*.22,front-muzzle*.35,p.head*.62,p.head*.48,muzzle,type==='sheep'?dark:coat),B(0,-p.head*.28,front,type==='cat'?.022:p.head*.51,type==='cat'?.019:p.head*.21,.018,dark)]);
  for(const s of [-1,1]){part(head,'eye',[s*p.head*.431,.022,p.head*.27],[B(0,0,0,.012,.018,.021,'#403f36')]);const ear=part(head,'ear',[s*p.head*.38,p.head*.45,-.005],type==='dog'?[B(0,-.04,0,.035,.115,.06,dark)]:[B(0,.02,0,.044,large?.09:.056,.045,coat),B(0,.05,0,.026,.025,.033,coat)]);ear.rotation.z=s*(large?-.25:-.10);}
  if(type==='reindeer')for(const s of [-1,1]){
    const antler=part(head,'antler',[s*.045,.093,-.035],[]);const shapes=[];
    for(let i=0;i<5;i++)shapes.push(B(s*i*.018,i*.033,-i*.011,.026,.047,.026,'#c7b997'));
    for(const i of [2,4])for(let j=1;j<3;j++)shapes.push(B(s*(i*.018+j*.02),i*.033+j*.018,-i*.011,.023,.032,.024,'#c7b997'));
    part(antler,'branches',[0,0,0],shapes);
  }
  if(type==='goat'){for(const s of [-1,1])part(head,'horn',[s*.037,.066,-.01],[B(0,.034,-.01,.022,.08,.024,dark),B(0,.075,-.028,.022,.025,.055,dark)]);part(head,'beard',[0,-.052,.087],[B(0,-.018,0,.036,.06,.032,coat)]);}
  const legs=[];
  for(const z of [-1,1])for(const x of [-1,1]){
    const upper=part(root,'leg',[x*p.width*.33,p.leg,z*p.length*.34],[B(0,-p.leg*.24,0,p.width*.23,p.leg*.52,p.width*.24,coat)]),lower=part(upper,'lower-leg',[0,-p.leg*.5,0],[B(0,-(p.leg*.5-.024)/2,0,p.width*.19,p.leg*.5-.024,p.width*.20,large?dark:coat),B(0,0,0,p.width*.19,.02,p.width*.20,large?dark:coat)]),foot=part(lower,'paw',[0,-p.leg*.5+.016,.012],[B(0,0,0,p.width*.27,.032,p.width*.35,large?dark:coat)]);legs.push({upper,lower,foot,x,z});
  }
  const tail=part(root,'tail',[0,y+.02,-p.length*.48],type==='cat'?[B(0,.02,-.085,.029,.032,.20,dark),B(0,.06,-.174,.03,.085,.035,dark)]:[B(0,large?-.10:.02,-.06,.041,large?.24:.04,large?.06:.15,dark)]);
  function pose(t,{moving=false,distance=0,action='idle'}={}){
    const cycle=distance*(large?10:19),bob=moving?Math.sin(cycle*2)*.004:0;body.position.y=y+bob;neck.rotation.x=(large?.18:0)+(action==='eat'?.48:Math.sin(t*.9+seed)*.04);head.rotation.y=Math.sin(t*.6+seed)*.07;
    legs.forEach((l,i)=>{
      const ph=cycle+(i===0||i===3?0:Math.PI),swing=moving?Math.cos(ph)*(large?.16:.22):0;
      l.upper.rotation.x=swing;l.lower.rotation.x=moving?Math.max(0,Math.sin(ph))*.13:0;
      // Each leg retains its standing length. Swinging feet lift; the trunk
      // does not scale or clip through the ground during the gait.
      l.upper.position.y=.016+p.leg*.5*Math.cos(swing)+(p.leg*.5-.016)*Math.cos(swing+l.lower.rotation.x)+.012*Math.sin(swing+l.lower.rotation.x)+(moving?Math.max(0,Math.sin(ph))*.018:0);l.foot.rotation.x=-l.upper.rotation.x-l.lower.rotation.x;
    });
    tail.rotation.y=Math.sin(t*(type==='dog'?5:1.5)+seed)*(type==='dog'?.4:.10);tail.rotation.x=type==='cat'&&action==='rest'?-.35:0;
    if(action==='rest'&&type==='cat'){body.position.y=y-.025;head.rotation.x=.14;}else head.rotation.x=0;
  }
  pose(0);return{root,pose,legs,head,tail,type,body:{radius:p.length*.55+p.head*.7,height:p.leg+p.body+p.neck+p.head+.15}};
}
function makeBird(type){
  const root=new THREE.Group(),insect=['butterfly','bee'].includes(type);let wings=[],feet=[];
  if(insect){part(root,'body',[0,0,0],[B(0,0,0,type==='bee'?.045:.025,.026,.10,type==='bee'?'#b9a16c':'#797668'),...(type==='bee'?[B(0,.004,-.015,.047,.026,.018,'#645e4f'),B(0,.004,.024,.047,.026,.018,'#645e4f')]:[])]);for(const s of [-1,1])wings.push(part(root,'wing',[s*.018,.007,0],[B(s*.038,0,0,type==='bee'?.06:.11,.013,.095,type==='bee'?'#dadbd0':'#cfb38d'),B(s*.053,0,-.06,.075,.013,.064,'#dbca9f')]));}
  else{
    part(root,'breast',[0,.086,0],[B(0,0,0,.095,.11,.14,'#a4ada0'),B(0,-.025,.045,.072,.079,.071,'#c8c5ac'),B(0,.066,.055,.080,.085,.08,'#82968f'),B(0,.065,.115,.033,.028,.064,'#b7a17b'),B(-.042,.072,.077,.012,.014,.013,'#424840'),B(.042,.072,.077,.012,.014,.013,'#424840'),B(0,-.005,-.105,.06,.034,.11,'#6e827b')]);
    for(const s of [-1,1]){feet.push(part(root,'foot',[s*.026,.023,.015],[B(0,0,0,.013,.045,.016,'#8b785e'),B(0,-.017,.02,.03,.012,.07,'#8b785e')]));wings.push(part(root,'wing',[s*.043,.10,-.01],[B(s*.025,0,-.01,.065,.025,.145,'#7e9387')]));}
  }
  function pose(t,{moving=false,distance=0,action='idle'}={}){const walking=moving&&action==='walk';wings.forEach((g,i)=>g.rotation.z=(i?-1:1)*(insect||moving&&!walking?Math.sin(t*(insect?26:15))*.75:.08));feet.forEach((f,i)=>{f.position.y=.023+(walking?Math.max(0,Math.sin(distance*24+i*Math.PI))*.02:0);f.position.z=.015+(walking?Math.cos(distance*24+i*Math.PI)*.018:0);});const breast=root.getObjectByName('breast');if(breast)breast.rotation.x=action==='eat'?.09:0;}
  return{root,pose,type,body:{radius:.14,height:.23}};
}
function makeRegionalBird(type){
  const root=new THREE.Group(),duck=type==='duck',owl=type==='owl',gull=type==='gull',coat=owl?'#92816a':gull?'#dddcd1':duck?'#a68b66':'#88959d',dark=owl?'#61594e':gull?'#68747a':duck?'#637e66':'#637b79';
  const torso=part(root,'body',[0,.11,0],[B(0,0,0,owl?.16:.13,owl?.18:.13,duck?.23:.18,coat),B(0,-.016,.05,.11,.10,.12,owl?'#c7bda4':gull?'#ece5d4':coat),B(0,-.008,-.12,.075,.027,.10,dark)]);
  const head=part(root,'head',[0,owl?.255:.235,owl?.016:.07],[B(0,0,0,owl?.17:.09,owl?.13:.10,.10,owl?coat:dark),B(0,-.027,.066,duck?.07:.027,.026,duck?.085:.055,owl?'#c5ac77':'#c8a05d')]);
  if(owl)for(const x of [-.044,.044])part(head,'face',[x,.007,.055],[B(0,0,0,.066,.083,.012,'#d4c7a7'),B(0,.006,.009,.026,.032,.01,'#44463f')]);
  else for(const s of [-1,1])part(head,'eye',[s*.047,.008,.024],[B(0,0,0,.012,.015,.016,'#3f4b46')]);
  const feet=[-1,1].map(s=>part(root,'foot',[s*.034,.04,.03],[B(0,0,0,.016,.068,.018,'#ad906a'),B(0,-.033,.023,.042,.014,.075,'#ad906a')]));
  const wings=[-1,1].map(s=>part(root,'wing',[s*.062,.15,-.005],[B(s*(gull?.095:.031),0,-.022,gull?.21:.072,.025,.15,dark),...(gull?[B(s*.208,0,-.045,.04,.024,.1,'#526268')]:[])]));
  function pose(t,{moving=false,distance=0,action='idle'}={}){
    const fly=action==='fly',cycle=distance*24;head.rotation.y=Math.sin(t*.7)*.13;head.rotation.x=action==='eat'?.19:0;
    wings.forEach((w,i)=>w.rotation.z=(i?-1:1)*(fly?Math.sin(t*9)*.55:gull?.55:.10));
    feet.forEach((f,i)=>{f.visible=action!=='swim';f.position.y=.04+(moving&&!fly?Math.max(0,Math.sin(cycle+i*Math.PI))*.024:0);f.position.z=.03+(moving&&!fly?Math.cos(cycle+i*Math.PI)*.02:0);});
    torso.rotation.x=action==='eat'?.10:0;
  }
  pose(0);return{root,pose,head,feet,type,body:{radius:gull?.34:duck?.25:.22,height:owl?.33:.30}};
}
function makeCamel(){
  const root=new THREE.Group(),coat='#c6a16d',light='#d5b680',shade='#b58d5d',dark='#79614b',eye='#453f35';
  const torso=part(root,'body',[0,.735,-.035],[B(0,0,0,.32,.29,.69,coat),B(0,-.04,-.025,.29,.25,.57,coat),B(0,.005,.28,.28,.29,.20,light),B(0,-.02,-.29,.28,.25,.20,shade)]);
  const hump=part(torso,'hump',[0,.12,-.055],[B(0,.04,0,.285,.15,.39,coat),B(0,.137,-.015,.23,.12,.28,coat),B(0,.215,-.025,.16,.065,.17,light),B(0,.254,-.025,.085,.025,.09,light)]);
  // The curve starts low at the chest, then rises to the small head.
  // Every neck section overlaps the next, including at the animated pivot.
  const neck=part(torso,'neck',[0,-.035,.305],[B(0,-.02,.065,.18,.18,.20,light),B(0,.045,.15,.15,.23,.17,coat),B(0,.19,.19,.135,.22,.13,coat),B(0,.325,.215,.12,.17,.13,light)]);
  const head=part(neck,'head',[0,.405,.235],[B(0,0,.025,.145,.14,.20,coat),B(0,-.029,.145,.135,.095,.15,light),B(0,-.051,.203,.125,.047,.055,shade),B(0,-.073,.12,.10,.035,.13,shade)]);
  const ears=[];
  for(const side of [-1,1]){
    part(head,'eye',[side*.074,.025,.06],[B(0,0,0,.012,.026,.027,eye),B(0,.020,-.002,.015,.011,.041,shade)]);
    part(head,'nostril',[side*.054,-.023,.222],[B(0,0,0,.023,.012,.01,dark)]);
    const ear=part(head,'ear',[side*.067,.047,-.047],[B(side*.023,.026,0,.055,.076,.04,coat),B(side*.024,.029,.022,.03,.044,.008,shade)]);ear.rotation.z=side*-.35;ears.push(ear);
  }
  const legs=[],upperLength=.31,lowerLength=.31,hipY=.613;
  for(const side of [-1,1])for(const front of [false,true]){
    const x=side*.111,z=front?.222:-.287;
    const upper=part(root,'leg-upper',[x,hipY,z],[B(0,-.06,0,.095,.17,.115,coat),B(0,-.207,0,.062,.22,.074,coat),B(0,-upperLength,0,.078,.06,.081,shade)]);
    const lower=part(upper,'leg-lower',[0,-upperLength,0],[B(0,-.147,0,.048,.30,.055,light),B(0,-.287,0,.058,.047,.060,shade)]);
    const foot=part(lower,'foot',[0,-lowerLength,0],[B(0,0,.026,.108,.048,.148,shade),B(-.027,-.007,.079,.041,.034,.05,dark),B(.027,-.007,.079,.041,.034,.05,dark)]);
    legs.push({upper,lower,foot,x,z,side,front});
  }
  const tail=part(torso,'tail',[0,.043,-.379],[B(0,-.095,-.018,.032,.22,.035,coat),B(0,-.225,-.023,.052,.09,.06,dark)]);
  function pose(t,{moving=false,distance=0,action='idle'}={}){
    const rest=action==='rest',cycle=distance/.30;
    neck.rotation.x=(rest?.10:.015)+Math.sin(t*.57)*.022;
    head.rotation.y=Math.sin(t*.47)*.10;head.rotation.x=rest?.065:Math.sin(t*.73)*.018;
    ears.forEach((ear,i)=>ear.rotation.y=Math.sin(t*1.1+i*2.3)*.09);
    tail.rotation.x=.10+Math.sin(t*.75)*.08;tail.rotation.z=Math.sin(t*.92)*.12;
    for(const leg of legs){
      const phase=((cycle+(leg.side<0?0:.5)+(leg.front?0:.08))%1+1)%1,stance=.66;
      const swing=Math.max(0,(phase-stance)/(1-stance)),smooth=swing*swing*(3-2*swing);
      const step=moving?(phase<stance?.099*(1-2*phase/stance):-.099+.198*smooth):0;
      const lift=moving?Math.sin(Math.PI*swing)*.055:0;
      const dy=hipY-(.024+lift),dz=step,d=Math.hypot(dy,dz),angle=Math.atan2(-dz,dy);
      // Two-link IK: the hip stays attached and the padded foot stays level.
      const bend=Math.acos(Math.max(-1,Math.min(1,(upperLength**2+d*d-lowerLength**2)/(2*upperLength*d)))),direction=leg.front?-1:1;
      leg.upper.rotation.x=angle+direction*bend;
      leg.lower.rotation.x=-direction*bend*2;
      leg.foot.rotation.x=-leg.upper.rotation.x-leg.lower.rotation.x;
    }
  }
  pose(0);return{root,pose,torso,hump,neck,head,legs,tail,ears,type:'camel',body:{radius:.91,height:1.27}};
}
function makeTurtle(){
  const root=new THREE.Group();part(root,'shell',[0,.078,0],[B(0,0,0,.23,.085,.29,'#8e9b79'),B(0,.039,0,.18,.045,.23,'#a8ad87'),B(0,.065,0,.10,.017,.17,'#b6b791')]);
  part(root,'head',[0,.045,.19],[B(0,0,0,.083,.064,.095,'#b0b08a'),B(-.043,.012,.02,.009,.011,.012,'#474e3b'),B(.043,.012,.02,.009,.011,.012,'#474e3b')]);
  const fins=[];for(const s of [-1,1])for(const z of [-1,1])fins.push(part(root,'flipper',[s*.097,.037,z*.075],[B(s*.06,0,z*.025,.15,.025,.06,'#a0a886')]));
  return{root,type:'turtle',body:{radius:.28,height:.16},pose:t=>fins.forEach((f,i)=>{f.rotation.y=Math.sin(t*1.3+i)*.20;})};
}
function makeCart(seed){
  const root=new THREE.Group(),wood='#b39a73',dark='#706553';
  const frame=[B(0,.16,.18,.39,.06,.50,wood),B(0,.23,.43,.42,.17,.04,wood),B(-.19,.23,.18,.04,.17,.50,wood),B(.19,.23,.18,.04,.17,.50,wood),B(0,.20,-.085,.40,.10,.035,wood)];
  for(const z of [0,.35])frame.push(B(0,.085,z,.52,.026,.026,dark));
  for(const x of [-.135,.135]){frame.push(B(x,.43,-.23,.027,.028,.39,dark));frame.push(B(x,.30,-.05,.027,.26,.027,dark));}
  part(root,'cart-frame',[0,0,0],frame);
  const wheels=[];for(const x of [-.245,.245])for(const z of [0,.35]){const wheel=part(root,'wheel',[x,.089,z],[]);for(const [radius,depth,color]of [[.089,.036,dark],[.064,.040,wood],[.018,.052,'#c8b58f']]){const geo=new THREE.CylinderGeometry(radius,radius,depth,24);geo.rotateZ(Math.PI/2);const c=new THREE.Color(color),data=[];for(let i=0;i<geo.attributes.position.count;i++)data.push(c.r,c.g,c.b);geo.setAttribute('color',new THREE.Float32BufferAttribute(data,3));const m=new THREE.Mesh(geo,material);m.castShadow=true;wheel.add(m);}part(wheel,'spokes',[0,0,0],[B(0,0,0,.044,.014,.127,'#c5b28d'),B(0,0,0,.044,.127,.014,'#c5b28d')]);wheels.push(wheel);}
  const load=makeProp('parcel',root);load.position.set(0,.203,.19);const driver=makeHuman(seed,null);root.add(driver.root);driver.root.position.z=-.55;
  return{root,type:'cart',body:{radius:.69,height:.9,rise:.035},driver,wheels,pose:(t,state={})=>{driver.pose(t,{...state,action:'push'});wheels.forEach(w=>w.rotation.x=(state.distance||0)/.089);}};
}
export function createActor(type='person',{seed=41,item=null,appearance={}}={}){
  const rig=type==='person'?makeHuman(seed,item,appearance):type==='camel'?makeCamel():animals[type]?makeAnimal(type,seed):type==='cart'?makeCart(seed):type==='turtle'?makeTurtle():['gull','duck','pigeon','owl'].includes(type)?makeRegionalBird(type):makeBird(type);
  rig.root.name=ACTORS[type];rig.root.userData.actor=type;rig.dispose=()=>{rig.root.traverse(o=>o.geometry?.dispose());rig.root.removeFromParent();};return rig;
}
