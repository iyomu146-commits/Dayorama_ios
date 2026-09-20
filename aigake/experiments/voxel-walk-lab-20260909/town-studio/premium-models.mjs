// Small, authored voxel recipes. Every part connects to a support or the ground.
// No runtime model/API generation: packs are deterministic local geometry.
const palettes={grove:['#8b6847','#bfa174','#77916b','#b88572'],harbor:['#907353','#c6b48c','#668b95','#bd7660'],canal:['#876851','#c6b08c','#668885','#b47b66'],meadow:['#9c7c51','#d0b379','#89a068','#ca9766'],alpine:['#856b52','#bca588','#748b89','#b27864'],satoyama:['#806347','#b9a17a','#74836a','#ad6957'],oasis:['#9c704d','#d4b380','#739c95','#b97b58'],snow:['#92715d','#c1ad97','#829ba3','#ac6c62'],stars:['#857153','#bea981','#6d829c','#b9a16a'],tropical:['#a18455','#d3ba84','#73a69c','#ce9671'],tokyo:['#737a77','#c2c0ae','#71988c','#b96a59']};
export function premiumModel(spec){
 const[wood,light,accent,cloth]=palettes[spec.region],metal='#535e60',stone='#a9aa99',cream='#e3dac1',leaf='#73905d',soil='#827157',glass='#afd0c8',red='#ac6153',v=spec.variant,kind=spec.recipe,map=new Map();
 const put=(x,y,z,color,tag='')=>{if(![x,y,z].every(Number.isInteger)||y<1)throw Error(`${spec.id}: invalid voxel`);map.set(`${x},${y},${z}`,{x,y,z,color,phase:3,tag});};
 const box=(x0,y0,z0,x1,y1,z1,color,tag)=>{for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)put(x,y,z,color,tag);};
 const line=(a,b,color)=>{let p=a.map(Math.round),end=b.map(Math.round);put(...p,color);while(p.some((n,i)=>n!==end[i])){for(let i=0;i<3;i++)if(p[i]!==end[i]){p[i]+=Math.sign(end[i]-p[i]);put(...p,color);}}};
 const ring=(cx,cy,cz,r,color,plane='xz')=>{let previous;for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,p=plane==='xy'?[cx+Math.round(r*Math.cos(a)),cy+Math.round(r*Math.sin(a)),cz]:plane==='yz'?[cx,cy+Math.round(r*Math.cos(a)),cz+Math.round(r*Math.sin(a))]:[cx+Math.round(r*Math.cos(a)),cy,cz+Math.round(r*Math.sin(a))];if(previous)line(previous,p,color);previous=p;}};
 const disk=(x,y,z,r,color)=>{for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(a*a+b*b<=r*r+.5)put(x+a,y,z+b,color);};
 const sphere=(x,y,z,r,color)=>{for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)for(let c=-r;c<=r;c++)if(a*a+b*b+c*c<=r*r+1&&y+b>=1)put(x+a,y+b,z+c,color);};
 const legs=(w,d,h,color=wood)=>{for(const x of [-w,w])for(const z of [-d,d])box(x,1,z,x,h,z,color);};
 const tabletop=(h=4,w=5,d=3,color=light)=>{legs(w-1,d-1,h-1);box(-w,h,-d,w,h,d,color);};
 const roof=(h,w,d,color)=>{for(let x=-w;x<=w;x++)box(x,h+Math.floor((w-Math.abs(x))/2),-d,x,h+Math.floor((w-Math.abs(x))/2)+1,d,color);};
 const tripod=(y=7)=>{for(const[x,z]of [[-3,-2],[3,-2],[0,3]])line([x,1,z],[0,y,0],metal);};
 const jar=(x,y,z,r=2,h=5,color=cloth)=>{for(let j=0;j<h;j++)disk(x,y+j,z,j===0||j===h-1?Math.max(1,r-1):r,color);ring(x,y+h,z,Math.max(1,r-1),light);};
 const pot=(x,y,z,variant)=>{box(x-2,y,z-2,x+2,y+2,z+2,cloth);box(x-1,y+3,z-1,x+1,y+3,z+1,soil);plant(x,y+4,z,variant);};
 function plant(x,y,z,type){
  if(['cactus','aloe','monstera','banana','datepalm','fir','yukitsuri','bamboo'].includes(type)){
   if(type==='cactus'){box(x-1,y,z-1,x+1,y+7,z+1,leaf);line([x,y+3,z],[x+3,y+3,z],leaf);line([x+3,y+3,z],[x+3,y+5,z],leaf);return;}
   if(type==='fir'||type==='yukitsuri'){box(x,y,z,x,y+10,z,wood);for(let h=2;h<10;h++){const r=Math.max(1,4-Math.floor(h/3));box(x-r,y+h,z-r,x+r,y+h,z+r,leaf);}if(type==='yukitsuri')for(const [dx,dz]of [[4,0],[-4,0],[0,4],[0,-4]])line([x+dx,y,z+dz],[x,y+11,z],cream);return;}
   const h=type==='aloe'?1:type==='datepalm'?9:type==='monstera'?4:6;box(x,y,z,x,y+h,z,wood);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])for(let j=0;j<=4;j++){const yy=y+h+(type==='aloe'?Math.floor(j/2):-Math.floor(j/2));line([x+dx*j,yy,z+dz*j],[x+dx*j+dz,yy,z+dz*j+dx],leaf);if(j)line([x+dx*(j-1),y+h+(type==='aloe'?Math.floor((j-1)/2):-Math.floor((j-1)/2)),z+dz*(j-1)],[x+dx*j,yy,z+dz*j],leaf);}return;
  }
  const tree=['apple','plum','olive','ginkgo','plumeria'].includes(type),h=tree?8:['lavender','herbs','edelweiss','seedlings','alpine','desert'].includes(type)?3:5;
  box(x,y,z,x,y+h,z,tree?wood:leaf);
  if(tree){for(const d of [-3,3])line([x,y+h-3,z],[x+d,y+h,z],wood);sphere(x-2,y+h,z,2,leaf);sphere(x+2,y+h+1,z,2,type==='ginkgo'?'#c3b466':leaf);if(type==='apple')for(const dx of [-3,1,3])put(x+dx,y+h,z+2,red);if(type==='plum'||type==='plumeria')for(const dx of [-2,2])box(x+dx-1,y+h+2,z,x+dx+1,y+h+2,z+1,type==='plum'?'#cb91a3':cream);return;}
  if(type==='fern'){for(let j=0;j<=3;j++)for(const d of [-1,1])line([x,y+j,z],[x+d*(4-j),y+j,z+1],leaf);return;}
  const color={hydrangea:'#8e9caf',hibiscus:'#c67472',chrysanthemum:'#d8be76',winterberry:'#ba685c',lavender:'#a09db9',edelweiss:cream,herbs:leaf}[type]||'#d0aa85';
  for(const [dx,dz]of [[-2,0],[2,0],[0,2]]){line([x,y+1,z],[x+dx,y+h-1,z+dz],leaf);box(x+dx-1,y+h,z+dz-1,x+dx+1,y+h,z+dz+1,color);put(x+dx,y+h+1,z+dz,cream);if(type==='hydrangea')sphere(x+dx,y+h+1,z+dz,1,color);}
 }
 function goods(type,x,y,z){
  if(['logs','coveredlogs','brushwood'].includes(type)){box(x-1,y,z-2,x+1,y+1,z+2,wood);box(x-1,y,z+3,x+1,y+1,z+3,light);return;}
  if(['books','reading','notebook','chart','menu','planisphere'].includes(type)){box(x-1,y,z-2,x+1,y,z+2,cream);box(x,y+1,z-2,x,y+1,z+2,accent);if(type==='books')box(x-1,y,z-1,x+1,y+3,z,cloth);return;}
  if(['skis','poles','rods','paddles','oars','shovels','garden','farm','tools','wagasa','umbrellas'].includes(type)){box(x,y,z,x,y+7,z,wood);const paddle=['oars','paddles','shovels'].includes(type);if(paddle)box(x-1,y+5,z,x+1,y+8,z,accent);else if(type==='skis')box(x-1,y,z,x+1,y+8,z,accent);else if(['wagasa','umbrellas'].includes(type)){for(let h=0;h<4;h++)box(x-h,y+7-h,z-1,x+h,y+7-h,z+1,cloth);}else if(['garden','farm','tools'].includes(type)){box(x-2,y+7,z,x+2,y+7,z,metal);for(const d of [-2,0,2])box(x+d,y+5,z,x+d,y+7,z,metal);}return;}
  if(['snowboards','surfboards'].includes(type)){for(let h=0;h<10;h++)box(x-(h===0||h===9?0:1),y+h,z,x+(h===0||h===9?0:1),y+h,z,h%3?accent:cream);return;}
  if(['boots','skates','shearing'].includes(type)){box(x-1,y,z-1,x+1,y+1,z+2,metal);box(x-1,y+2,z-1,x+1,y+4,z,wood);if(type==='skates')box(x,y-1,z-2,x,y-1,z+4,stone);return;}
  if(['seedlings','flowers','bonsai'].includes(type)){pot(x,y,z,type==='bonsai'?'plum':'seedlings');return;}
  if(type==='shells'){box(x-2,y,z-1,x+2,y,z+1,cream);box(x-1,y+1,z-1,x+1,y+1,z,cream);put(x,y+2,z-1,cloth);return;}
  if(type==='fish'){box(x-2,y,z,x+1,y,z+1,type==='fish'?glass:cream);box(x+2,y,z-1,x+2,y,z+2,type==='fish'?stone:cloth);put(x-2,y+1,z,metal);return;}
  if(type==='berries'){box(x-1,y,z-1,x+1,y,z+1,'#8c6584');put(x,y+1,z,'#8c6584');return;}
  if(['apples','berries','dates','pumpkins','coconuts','fruit','vegetables','eggs'].includes(type)){const r=['pumpkins','coconuts'].includes(type)?2:1;sphere(x,y+r-1,z,r,{apples:red,berries:'#8c6584',dates:wood,pumpkins:'#c18c4c',coconuts:wood,eggs:cream,vegetables:leaf}[type]||cloth);if(type!=='eggs')put(x,y+2*r-1,z,leaf);return;}
  if(['bread','hay','cheese','ice','sculpture'].includes(type)){box(x-2,y,z-1,x+2,y+2,z+1,{bread:'#c89c5e',hay:'#c7b272',cheese:'#ddc78a',ice:glass,sculpture:stone}[type]);if(type==='bread')for(const dx of [-1,1])put(x+dx,y+2,z,cream);return;}
  if(['bottles','honey','juice','spices','tea','coffee','cocoa','coppertea','pots','pottery','watering'].includes(type)){jar(x,y,z,1,type==='watering'?3:2,type==='coffee'||type==='cocoa'?cream:cloth);if(type==='watering'){line([x+1,y+1,z],[x+4,y+3,z],accent);box(x-2,y+1,z,x-2,y+3,z,accent);box(x-2,y+3,z,x,y+3,z,accent);}return;}
  if(type==='eyepieces'){for(let h=0;h<3;h++)disk(x,y+h,z,1,h===2?glass:metal);return;}
  if(type==='binoculars'){for(const dx of [-1,1])box(x+dx,y,z-1,x+dx,y+2,z+2,metal);box(x-1,y+1,z,x+1,y+1,z,metal);put(x-1,y+2,z+2,glass);put(x+1,y+2,z+2,glass);return;}
  if(type==='snorkels'){box(x-2,y,z,x+2,y+1,z,metal);box(x-1,y,z+1,x+1,y+1,z+1,glass);box(x+2,y,z,x+2,y+5,z,accent);return;}
  if(['rings','buoys','fenders','climbing','rope','snorkels'].includes(type)){ring(x,y+2,z,2,type==='rings'?cream:accent,'xy');return;}
  if(['painting','thread','seeds'].includes(type)){box(x-1,y,z-1,x+1,y+2,z+1,cloth);put(x,y+3,z,cream);return;}
  if(type==='mushroom'){box(x,y,z,x,y+2,z,cream);disk(x,y+3,z,2,wood);return;}
  if(type==='saddles'){box(x-2,y,z-1,x+2,y+1,z+1,wood);box(x-2,y+2,z-1,x-2,y+2,z+1,cloth);box(x+2,y+2,z-1,x+2,y+2,z+1,cloth);return;}
  if(['packs','parcels','sacks','wool','blankets','picnic','bamboo','soil'].includes(type)){box(x-1,y,z-1,x+1,y+2,z+1,type==='soil'?soil:type==='wool'?cream:cloth);box(x,y+3,z-1,x,y+3,z+1,light);if(type==='parcels')box(x,y,z+2,x,y+2,z+2,cream);return;}
  throw Error(`Unsupported goods ${type}`);
 }
 let seat=null;
 if(kind==='seat'){
  const w=['folding','rattan','stump','observer'].includes(v)?2:5;
  if(v==='stump'||v==='log'){for(let y=1;y<=2;y++)disk(0,y,0,v==='stump'?2:3,wood);if(v==='log'){box(-5,1,-1,5,2,1,wood);box(-5,3,-1,5,3,1,light);}else disk(0,3,0,2,light);}
  else if(v==='recliner'){legs(2,4,1);box(-3,2,-1,3,2,5,light);for(let j=0;j<5;j++)box(-3,2+j,-j-2,3,2+j,-j-2,cloth);line([-3,2,-2],[-3,6,-6],wood);line([3,2,-2],[3,6,-6],wood);}
  else{legs(w-1,1,1,['iron','steel'].includes(v)?metal:wood);box(-w,2,-2,w,2,2,['stone','adobe'].includes(v)?stone:light);if(v!=='engawa'){for(const x of [-w,w])box(x,1,-2,x,6,-2,wood);box(-w,4,-2,w,4,-2,accent);box(-w,6,-2,w,6,-2,accent);}if(['cushion','blanket'].includes(v))box(-w+1,3,-1,w-1,3,1,cloth);if(v==='rattan'||v==='bamboo')for(let x=-w;x<=w;x+=2)box(x,3,-2,x,6,-2,light);seat={x:0,z:0,y:['cushion','blanket'].includes(v)?3:2,front:2.5};}
 }
 else if(kind==='table'){
  if(v==='stump'){for(let y=1;y<4;y++)disk(0,y,0,2,wood);disk(0,4,0,5,light);}else if(v==='cafe'||v==='mosaic'){box(-2,1,-2,2,1,2,stone);box(0,2,0,0,3,0,metal);disk(0,4,0,4,v==='mosaic'?cream:light);if(v==='mosaic')for(const[x,z]of [[-2,0],[0,2],[2,0],[0,-2]])put(x,4,z,accent);}
  else{tabletop(4,v==='camp'?4:5);if(v==='picnic')for(const z of [-5,5]){box(-4,1,z,4,1,z,wood);box(-5,2,z-1,5,2,z+1,light);}if(v==='blanket')box(-5,5,-3,5,5,3,cloth);}
  if(v==='chess'){for(let x=-3;x<=3;x++)for(let z=-2;z<=2;z++)put(x,5,z,(x+z)%2?cream:metal);for(const z of [-2,2])for(const x of [-3,0,3])put(x,6,z,z<0?cream:wood);}
  else if(!['stump','picnic','mosaic','bamboo','cafe','camp','blanket'].includes(v)){const type={tea:'tea',net:'rope',weaving:'thread'}[v]||v;goods(type,-2,5,0);goods(type,2,5,0);if(v==='notebook'){box(-4,5,3,1,5,3,wood);box(3,5,1,3,7,2,accent);}if(v==='chart'){box(-4,5,-3,4,5,-3,light);put(-1,6,-1,accent);}}
 }
 else if(kind==='rack'){
  const tall=['skis','snowboards','surfboards','rods','poles','oars','paddles','shovels','garden','farm','wagasa','umbrellas'].includes(v),h=tall?12:11;
  for(const x of [-6,6])box(x,1,-1,x,h,1,wood);for(const y of [1,tall?5:6])box(-6,y,-2,6,y,2,light);box(-6,h,-1,6,h,0,wood);
  if(v==='bikes'){for(const x of [-4,0,4]){box(x,1,-3,x,1,4,metal);box(x,2,-3,x,5,-3,metal);box(x,5,-3,x,5,1,metal);box(x,2,1,x,5,1,metal);}}
  else for(const x of [-3,3]){goods(v,x,tall?2:2,0);if(!tall)goods(v,x,7,0);}
  if(v==='coveredlogs'){box(-6,1,-1,-6,13,1,wood);box(6,1,-1,6,13,1,wood);roof(13,7,4,accent);}
 }
 else if(kind==='planter'){pot(0,1,0,v);}
 else if(kind==='bed'){box(-6,1,-4,6,1,4,soil);for(const z of [-4,4])box(-6,2,z,6,2,z,wood);for(const x of [-6,6])box(x,2,-4,x,2,4,wood);for(const[x,z]of [[-3,-1],[3,-1],[0,2]])plant(x,2,z,v);}
 else if(kind==='basket'){box(-4,1,-3,4,1,3,light);for(const x of [-4,4])box(x,2,-3,x,4,3,wood);for(const z of [-3,3])box(-4,2,z,4,4,z,light);for(const x of [-2,2])goods(v,x,2,0);if(v==='picnic'){line([-4,4,0],[-4,7,0],wood);line([-4,7,0],[4,7,0],wood);line([4,7,0],[4,4,0],wood);}}
 else if(kind==='cart'){
  for(const x of [-5,5]){ring(x,3,0,2,metal,'yz');box(x,1,-1,x,3,1,metal);}box(-5,3,0,5,3,0,metal);box(-4,4,-3,4,4,3,light);for(const z of [-3,3])box(-4,5,z,4,5,z,wood);for(const x of [-4,4])box(x,5,-3,x,5,3,wood);for(const x of [-3,3])box(x,4,3,x,4,7,wood);for(const x of [-2,2])goods(v,x,5,0);
 }
 else if(kind==='display'){tabletop(4,6,3);for(const x of [-3,3])goods(v,x,5,0);}
 else if(kind==='birdhouse'||kind==='animalhouse'){
  const raised=kind==='birdhouse',bottom=raised?8:1,w=raised?3:5;if(raised){box(-2,1,-2,2,1,2,stone);box(0,2,0,0,8,0,wood);}box(-w,bottom,-3,w,bottom+4,3,light);box(-1,bottom+1,4,1,bottom+3,4,metal);box(-2,bottom,3,2,bottom,5,wood);roof(bottom+5,w+1,4,v==='snow'?cream:accent);if(kind==='animalhouse'){box(-5,1,4,5,1,8,wood);box(-5,2,8,5,2,8,wood);}}
 else if(kind==='feeder'){
  if(v==='hay'||v==='camel'){legs(5,2,3);box(-5,3,-3,5,3,3,wood);for(const x of [-5,5])box(x,4,-3,x,6,3,wood);for(let x=-4;x<=4;x+=2)for(const z of [-3,3])box(x,3,z,x,6,z,light);box(-4,4,-2,4,5,2,'#beaa70');}
  else{box(-2,1,-2,2,1,2,stone);box(0,2,0,0,7,0,wood);box(-4,8,-3,4,8,3,light);for(const x of [-3,3])box(x,9,0,x,12,0,wood);roof(12,5,4,v==='winter'?cream:accent);put(0,9,0,'#c1a475');}
 }
 else if(kind==='insecthotel'){legs(3,1,2);box(-4,3,-2,4,10,1,wood);for(const y of [4,7,9])for(const x of [-2,0,2]){put(x,y,2,metal);put(x,y+1,2,light);}roof(11,5,3,accent);}
 else if(kind==='beehive'){for(const cx of v==='double'?[-4,4]:[0]){box(cx-3,1,-2,cx+3,1,3,wood);box(cx-2,2,-2,cx+2,7,2,light);for(const y of [3,5])box(cx-2,y,-2,cx+2,y,2,cream);box(cx-3,8,-3,cx+3,8,3,accent);box(cx-1,2,3,cx+1,2,3,metal);}}
 else if(kind==='tank'){for(let y=1;y<=10;y++)disk(0,y,0,4,y===3||y===8?metal:wood);disk(0,11,0,4,accent);line([0,3,4],[0,3,6],metal);box(0,2,6,0,3,6,metal);box(-3,1,-1,-3,14,-1,metal);line([-3,14,-1],[1,14,-1],metal);}
 else if(kind==='pump'||kind==='hydrant'){box(-3,1,-3,3,1,3,stone);box(-1,2,-1,1,8,1,kind==='hydrant'?red:accent);box(-3,6,-1,3,7,1,metal);box(2,4,0,2,6,0,metal);if(kind==='pump'){line([0,9,0],[-4,11,0],metal);box(-4,8,0,-4,11,0,wood);}else box(-2,9,-2,2,9,2,red);}
 else if(kind==='lamp'){
  const low=v==='lowred',h=low?4:v==='paper'?6:12;colorLamp();
  function colorLamp(){const c=['red','lowred'].includes(v)?'#b47768':'#dfce9c';box(-2,1,-2,2,1,2,stone);box(0,2,0,0,h,0,['stone','snow','ice'].includes(v)?v==='ice'?glass:stone:metal);const topX=['hanging','bracket'].includes(v)?3:0;if(topX)box(0,h,0,topX,h,0,metal);box(topX-2,h-3,-2,topX+2,h,2,c,'light');for(const x of [topX-2,topX+2])for(const z of [-2,2])box(x,h-3,z,x,h,z,v==='brass'?light:metal);box(topX-3,h+1,-3,topX+3,h+1,3,v==='snow'?cream:v==='ice'?glass:accent);if(v==='stone')box(-2,h+2,-2,2,h+2,2,stone);if(v==='ice')box(-2,h+2,-2,2,h+3,2,glass);}
 }
 else if(kind==='arch'||kind==='canopy'||kind==='swing'||kind==='hammock'){
  const h=kind==='hammock'?9:14;for(const x of [-7,7]){box(x-1,1,-1,x+1,1,1,stone);box(x,2,0,x,h,0,wood);}if(kind!=='hammock')box(-8,h,0,8,h,0,wood);
  if(kind==='arch'){if(v==='gate')for(const x of [-5,5]){box(x,1,0,x,8,0,light);box(-5,4,0,5,4,0,light);}if(v==='noren')for(const x of [-5,-1,3])box(x,8,0,x+2,13,0,accent);if(v==='vine')for(const x of [-7,7]){box(x-1,6,-1,x+1,12,1,leaf);box(x-2,14,-1,x+2,14,1,leaf);}}
  if(kind==='canopy'){for(const x of [-7,7])for(const z of [-5,5])box(x,1,z,x,13,z,wood);for(let x=-8;x<=8;x++)box(x,14+Math.floor((8-Math.abs(x))/4),-6,x,15+Math.floor((8-Math.abs(x))/4),6,v==='palm'?leaf:v==='striped'&&x%4<2?cream:cloth);if(v==='woven'){box(-5,1,1,5,1,3,wood);box(-5,2,1,5,2,3,cloth);}}
  if(kind==='swing'){for(const x of [-3,3])box(x,4,0,x,13,0,light);box(-4,3,-2,4,3,2,wood);for(const x of [-7,7])for(const z of [-4,4])line([x,1,z],[x,12,0],wood);}
  if(kind==='hammock')for(let x=-6;x<=6;x++){const y=4+Math.floor(Math.abs(x)*.6);box(x,y,-2,x,y,2,v==='woven'?light:cloth);if(x<6){const yy=4+Math.floor(Math.abs(x+1)*.6);box(x,Math.min(y,yy),-2,x,Math.max(y,yy),2,cloth);}} 
 }
 else if(kind==='compost'||kind==='crate'||kind==='chest'||kind==='sacks'){
  if(kind==='sacks'){for(const x of [-3,3]){box(x-2,1,-2,x+2,5,2,light);box(x-1,6,-1,x+1,6,1,wood);}}else{box(-5,1,-3,5,1,3,wood);for(const x of [-5,5])box(x,2,-3,x,6,3,light);for(const z of [-3,3])box(-5,2,z,5,6,z,wood);if(kind==='compost')box(-4,2,-2,4,4,2,soil);else if(kind==='crate')for(const x of [-2,2])goods('vegetables',x,2,0);else{box(-5,7,-3,5,7,3,accent);for(const x of [-3,3])box(x,1,4,x,7,4,metal);box(-1,4,4,1,4,4,light);}}
 }
 else if(kind==='basin'||kind==='sink'){
  const pedestal=['bird','drinking','city','fountain'].includes(v),bottom=pedestal?6:2,r=pedestal?3:5;if(pedestal){box(-2,1,-2,2,1,2,stone);box(-1,2,-1,1,5,1,stone);}else box(-r,1,-3,r,1,3,v==='log'?wood:stone);box(-r,bottom,-3,r,bottom,3,stone);for(const x of [-r,r])box(x,bottom+1,-3,x,bottom+2,3,stone);for(const z of [-3,3])box(-r,bottom+1,z,r,bottom+2,z,stone);box(-r+1,bottom+1,-2,r-1,bottom+1,2,glass);
  if(kind==='sink'||v==='bamboo'||v==='fountain'||v==='city'){box(0,bottom+2,-3,0,bottom+6,-3,v==='bamboo'?leaf:metal);box(0,bottom+6,-3,0,bottom+6,0,v==='bamboo'?light:metal);put(0,bottom+5,0,glass);}
  if(v==='bamboo'&&kind==='basin'){for(const x of [-3,3])box(x,bottom+2,0,x,bottom+4,0,wood);box(-3,bottom+4,0,3,bottom+4,0,wood);line([-3,bottom+3,0],[3,bottom+5,0],leaf);}
 }
 else if(kind==='chopping'){for(let y=1;y<=3;y++)disk(0,y,0,3,wood);disk(0,4,0,3,light);line([0,5,0],[3,9,0],wood);box(-1,5,-1,1,7,0,metal);}
 else if(kind==='sign'||kind==='gauge'||kind==='clock'||kind==='mail'){
  const h=kind==='gauge'?14:kind==='mail'?8:12;box(-2,1,-2,2,1,2,stone);box(0,2,0,0,h,0,metal);
  if(kind==='gauge'){box(-1,2,1,1,h,1,cream);for(let y=3;y<h;y+=2)put(1,y,2,accent);box(0,3,2,0,v==='temperature'?9:v==='snow'?6:11,2,red);}
  if(kind==='clock'){box(-3,h-2,-1,3,h+3,1,accent);box(-2,h-1,2,2,h+2,2,cream);box(0,h,3,0,h+2,3,metal);box(0,h,3,2,h,3,metal);}
  if(kind==='mail'){box(-3,6,-2,3,11,2,v==='red'?red:accent);box(-2,9,3,2,9,3,metal);box(-1,7,3,1,7,3,cream);}
  if(kind==='sign'){const wide=['map','timetable','schedule'].includes(v)?5:4;box(-wide,7,0,wide,12,1,light);box(-wide+1,8,2,wide-1,11,2,accent);if(v==='trail'||v==='city')box(4,9,0,6,10,1,light);if(v==='compass'){box(-6,11,0,6,11,0,light);box(0,11,-5,0,11,5,light);}else for(let y=9;y<=11;y+=2)box(-wide+2,y,3,wide-2,y,3,cream);if(v==='sandwich')for(const x of [-4,4]){line([x,1,-4],[x,11,0],wood);box(x,1,0,x,11,0,wood);}}
 }
 else if(kind==='lifering'){box(-2,1,-1,2,1,1,stone);box(0,2,0,0,11,0,metal);ring(0,9,1,3,cream,'xy');for(const x of [-3,3])put(x,9,1,red);}
 else if(kind==='rope'){for(const r of [2,3,4])ring(0,1,0,r,light);line([4,1,0],[6,1,3],light);}
 else if(kind==='frame'||kind==='screen'||kind==='fence'){
  const h=kind==='fence'?7:kind==='screen'?10:12;for(const x of [-6,6])box(x,1,0,x,h,0,wood);for(const y of [2,h])box(-6,y,0,6,y,0,light);
  if(kind==='fence'){for(let x=-4;x<=4;x+=2)box(x,2,0,x,h,0,v==='iron'?metal:v==='stone'?stone:light);if(v==='woven')for(const y of [3,5])box(-6,y,1,6,y,1,wood);}
  else if(kind==='screen'){for(let x=-5;x<=5;x++)box(x,3,0,x,9,0,v==='carved'&&x%2?light:cloth);for(const x of [-6,6])box(x,1,-2,x,1,2,wood);}
  else if(v==='net'){for(let x=-5;x<=5;x+=2)box(x,3,0,x,11,0,light);for(let y=4;y<12;y+=2)box(-5,y,0,5,y,0,light);}
  else if(['laundry','towels','mittens','rug'].includes(v)){for(const x of v==='rug'?[-4]:[-4,0,4]){box(x,6,0,x+(v==='rug'?8:2),11,0,cloth);box(x,7,1,x+(v==='rug'?8:2),7,1,cream);}}
  else for(const x of [-4,0,4]){box(x,8,0,x,11,0,light);goods(v==='herbs'?'vegetables':v==='wheat'||v==='rice'?'hay':v==='radish'?'vegetables':'fish',x,7,0);}
 }
 else if(kind==='trap'){const w=v==='lobster'?6:4;box(-w,1,-3,w,1,3,wood);for(const z of [-3,3])for(let x=-w;x<=w;x+=2)box(x,2,z,x,5,z,light);for(const x of [-w,w])box(x,2,-3,x,5,3,light);for(let x=-w;x<=w;x+=2)box(x,6,-3,x,6,3,light);box(-w,5,-3,w,5,3,wood);}
 else if(kind==='anchor'){box(-5,1,-2,5,1,2,wood);box(0,2,0,0,12,0,metal);box(-4,9,0,4,9,0,metal);line([-5,4,0],[0,2,0],metal);line([0,2,0],[5,4,0],metal);box(-5,4,0,-5,6,0,metal);box(5,4,0,5,6,0,metal);ring(0,13,0,1,metal,'xy');}
 else if(kind==='winch'||kind==='reel'||kind==='wheel'||kind==='mill'){box(-4,1,-3,4,1,3,stone);if(kind==='wheel'||kind==='mill'){box(-2,2,-2,2,4,2,stone);disk(0,5,0,4,kind==='wheel'?wood:stone);if(kind==='wheel')jar(0,6,0,2,3,cloth);else box(3,6,0,3,8,0,wood);}else{for(const x of [-3,3])box(x,2,0,x,7,0,metal);box(-3,5,0,3,5,0,metal);for(const x of [-2,-1,0,1,2])ring(x,5,0,2,kind==='reel'?accent:light,'yz');line([3,5,0],[5,7,0],metal);}}
 else if(kind==='boat'){for(const z of [-4,4])box(-3,1,z,3,2,z,wood);const length=v==='kayak'?10:8;for(let z=-length;z<=length;z++){const w=Math.max(0,Math.min(v==='kayak'?2:4,length-Math.abs(z)));box(-w,3,z,w,3,z,light);if(w){box(-w,4,z,-w,5,z,accent);box(w,4,z,w,5,z,accent);}}for(const z of [-3,3])box(-3,5,z,3,5,z,wood);}
 else if(kind==='instrument'){
  if(v==='sundial'||v==='armillary'){box(-3,1,-3,3,1,3,stone);box(-1,2,-1,1,6,1,stone);disk(0,7,0,4,light);if(v==='sundial')line([0,8,0],[0,11,-3],metal);else{ring(0,11,0,4,light,'xy');ring(0,11,0,4,light);box(0,8,0,0,11,0,metal);}}
  else{tripod(7);box(-1,7,-1,1,9,1,metal);if(v==='camera'){box(-3,9,-1,3,12,1,metal);box(-1,10,2,1,11,3,accent);}else if(v==='binocular'){for(const x of [-2,2]){box(x-1,9,-3,x+1,11,4,accent);box(x-1,9,5,x+1,11,5,glass);}box(-2,9,0,2,9,0,metal);}else if(v==='equatorial'){line([-3,8,0],[3,12,0],metal);box(-4,8,-1,-2,10,1,metal);box(2,12,-2,4,12,2,light);}else{const r=v==='reflector'?2:1;for(let z=-4;z<=5;z++){const h=10+Math.floor(z/3);box(-r,h-r,z,r,h+r,z,cream);if(z>-4)box(-r,h-r-1,z,r,h+r,z,cream);}box(-r,10+Math.floor(5/3)-r,6,r,10+Math.floor(5/3)+r,6,glass);if(v==='solar'){box(0,1,-6,0,9,-6,metal);box(-3,9,-8,3,9,-4,cream);}}}
 }
 else if(kind==='flag'||kind==='chime'){box(-2,1,-2,2,1,2,stone);box(0,2,0,0,17,0,wood);if(kind==='flag'){box(1,12,0,6,16,0,accent);box(5,12,0,6,13,0,cream);}else{box(0,17,0,4,17,0,wood);box(4,13,0,4,16,0,light);box(3,11,-1,5,12,1,glass);box(4,7,0,4,10,0,cream);}}
 else if(kind==='mooring'||kind==='bollards'){for(const x of kind==='bollards'?[-4,4]:[0]){box(x-2,1,-2,x+2,1,2,stone);box(x-1,2,-1,x+1,6,1,kind==='mooring'?wood:metal);box(x-2,7,-1,x+2,7,1,metal);}}
 else if(kind==='easel'||kind==='lectern'){for(const x of [-3,3])line([x,1,2],[x,11,0],wood);line([0,1,-4],[0,10,0],wood);box(-4,5,0,4,11,0,wood);box(-3,6,1,3,10,1,cream);box(-4,5,1,4,5,2,wood);if(kind==='easel'){box(-2,7,2,1,8,2,accent);put(2,9,2,cloth);}else goods(v==='chart'?'chart':'menu',0,6,2);}
 else if(kind==='press'){tabletop(4);for(const x of [-4,4])box(x,5,0,x,12,0,wood);box(-4,12,0,4,12,0,wood);box(0,6,0,0,13,0,metal);box(-3,6,-2,3,7,2,metal);box(-3,13,0,3,13,0,metal);}
 else if(kind==='loom'){for(const x of [-5,5])box(x,1,0,x,12,0,wood);for(const y of [2,12])box(-5,y,0,5,y,0,light);for(let x=-4;x<=4;x++)box(x,3,0,x,11,0,x%2?cream:cloth);box(-5,6,1,5,6,1,wood);for(const x of [-5,5])box(x,1,-3,x,1,3,wood);}
 else if(kind==='repair'||kind==='bicycle'){
  for(const x of [-5,5]){ring(x,4,0,3,metal,'xy');line([x,1,0],[x,7,0],stone);line([x-3,4,0],[x+3,4,0],stone);}for(const[a,b]of [[[-5,4,0],[0,8,0]],[[0,8,0],[2,4,0]],[[-5,4,0],[2,4,0]],[[2,4,0],[5,8,0]],[[5,4,0],[5,10,0]],[[0,8,0],[5,8,0]]])line(a,b,accent);box(-2,9,-1,1,9,1,wood);box(4,11,-2,5,11,2,metal);line([1,4,0],[1,1,2],metal);if(v==='cargo')box(-7,8,-2,-4,10,2,light);if(kind==='repair'){box(8,1,-3,8,8,3,metal);box(4,8,0,8,8,0,metal);}if(v==='share')box(-6,6,1,-3,7,1,accent);
 }
 else if(kind==='hay'){if(v==='round'){for(let z=-3;z<=3;z++){for(let x=-4;x<=4;x++)for(let y=1;y<=9;y++)if(x*x+(y-5)**2<=17)put(x,y,z,'#c3ac6a');}for(const z of [-2,2])ring(0,5,z,4,wood,'xy');}else{box(-5,1,-2,5,4,2,'#c3ac6a');for(const x of [-3,3]){box(x,1,-3,x,4,3,wood);}}}
 else if(kind==='vessel'||kind==='churn'){jar(0,1,0,3,kind==='churn'?6:v==='milk'?7:v==='oil'?8:5,v==='milk'?stone:v==='pickles'?wood:cloth);if(kind==='churn')box(0,7,0,0,12,0,wood);if(v==='milk'){disk(0,9,0,2,metal);box(-4,5,0,-3,7,0,metal);box(3,5,0,4,7,0,metal);}if(v==='pickles'){disk(0,6,0,3,light);box(-1,7,-1,1,8,1,stone);}if(v==='oil')disk(0,10,0,2,wood);if(v==='bucket'){box(-3,6,0,-3,9,0,wood);box(3,6,0,3,9,0,wood);box(-3,9,0,3,9,0,wood);}}
 else if(kind==='coldframe'){box(-6,1,-4,6,1,4,soil);for(const z of [-4,4])box(-6,2,z,6,4,z,wood);for(const x of [-6,6])box(x,2,-4,x,4,4,wood);for(let z=-4;z<=4;z++)box(-6,5+Math.floor((z+4)/4),z,6,6+Math.floor((z+4)/4),z,glass);for(const x of [-6,0,6])for(let z=-4;z<=4;z++)put(x,6+Math.floor((z+4)/4),z,wood);}
 else if(kind==='weather'){box(-3,1,-3,3,1,3,stone);box(0,2,0,0,16,0,metal);if(v==='vane'){box(-5,15,0,5,15,0,light);box(4,14,0,5,16,0,light);box(-5,14,0,-3,16,0,accent);}else if(v==='rain'){box(-2,9,-2,2,9,2,stone);box(-1,10,-1,1,14,1,glass);ring(0,15,0,2,stone);}else{box(-3,9,-2,3,12,2,cream);box(-5,16,0,5,16,0,metal);for(const x of [-5,5])disk(x,17,0,1,stone);}}
 else if(kind==='sled'){for(const x of [-3,3]){box(x,1,-6,x,1,6,metal);box(x,2,5,x,3,6,metal);}box(-3,3,-5,3,3,4,light);for(const x of [-3,3])box(x,1,-4,x,3,-4,wood);if(v!=='child')for(const x of [-1,1])goods(v,x,4,0);else{box(-3,4,-5,3,6,-5,wood);}}
 else if(kind==='stove'||kind==='oven'||kind==='brazier'){
  const clay=kind==='oven'||v==='shichirin';if(kind==='brazier'){box(-5,1,-4,5,1,4,stone);for(const x of [-4,4])box(x,2,-3,x,4,3,stone);for(const z of [-3,3])box(-4,2,z,4,4,z,stone);goods('logs',0,2,0);}
  else{legs(3,2,2);box(-3,3,-2,3,7,2,clay?cloth:metal);box(-2,4,3,2,6,3,wood);box(-1,5,4,1,5,4,'#ccad78','light');box(-4,8,-3,4,8,3,stone);if(v==='iron'){box(-2,9,-1,-1,16,0,metal);}else if(kind==='oven')roof(9,4,3,cloth);else ring(0,9,0,2,metal);}
 }
 else if(kind==='cabinet'||kind==='machine'||kind==='bins'){
  if(kind==='bins'){for(const x of [-4,0,4]){box(x-1,1,-2,x+1,6,2,accent);box(x-2,7,-2,x+2,7,2,metal);put(x,7,0,cream);}}
  else{const h=kind==='machine'?14:11;box(-4,1,-3,4,h,2,kind==='machine'&&v==='drinks'?cream:accent);box(-3,2,3,3,h-1,3,metal);
   if(kind==='cabinet'){if(v==='firstaid'||v==='rescue'){box(-2,6,4,2,6,4,cream);box(0,4,4,0,8,4,cream);}else if(v==='electric'||v==='battery'){for(const y of [3,5,7])box(-3,y,4,3,y,4,stone);box(-1,9,4,1,10,4,light);}else for(const y of [3,7])for(const x of [-2,2]){box(x-1,y,4,x+1,y+2,4,light);put(x+1,y+1,5,metal);}}
   else if(v==='ac'){ring(0,7,4,3,stone,'xy');box(-2,7,4,2,7,4,stone);box(0,5,4,0,9,4,stone);}
   else if(v==='capsule'){box(-3,7,3,3,13,4,glass);for(const[x,y]of [[-2,8],[0,10],[2,8]])put(x,y,5,cloth);box(-1,3,4,1,4,4,metal);}
   else if(v==='phone'){box(-3,5,3,3,12,4,glass);box(-2,7,5,-1,10,5,leaf);for(const y of [7,9])for(const x of [1,2])put(x,y,5,cream);}
   else{box(-3,8,4,1,12,4,glass);for(let x=-2;x<=0;x+=2)for(const y of [9,11])put(x,y,5,v==='icecream'?cloth:cream);box(2,6,4,2,10,4,stone);box(-2,3,4,1,4,4,wood);if(v==='tickets'||v==='parking')box(-1,6,4,1,6,4,cream);if(v==='icecream'){box(-4,4,4,-3,12,4,cream);box(-4,7,5,-3,8,5,metal);}if(v==='parking'){box(-5,15,-3,5,17,3,accent);box(-2,16,4,2,16,4,cream);}}
  }
 }
 else if(kind==='cairn'){for(let y=1;y<=7;y++){const r=Math.max(1,4-Math.floor(y/2));disk(y%2,y,0,r,stone);}}
 else if(kind==='well'){box(-5,1,-4,5,1,4,stone);for(const x of [-5,5])box(x,2,-4,x,4,4,stone);for(const z of [-4,4])box(-5,2,z,5,4,z,stone);for(const x of [-5,5])box(x,5,0,x,12,0,wood);box(-5,12,0,5,12,0,wood);box(0,6,0,0,11,0,light);jar(0,4,0,2,2,wood);}
 else if(kind==='surface'){if(v==='stepping'){for(const [x,z]of [[-5,-1],[0,1],[5,-1]])disk(x,1,z,2,stone);}else{box(-5,1,-4,5,1,4,cloth);for(let x=-5;x<=5;x+=2)box(x,1,-4,x,1,4,v==='scraper'?metal:light);}}
 else if(kind==='sluice'){box(-6,1,-3,6,1,3,stone);for(const x of [-6,6])box(x,2,-3,x,10,3,stone);box(-6,10,0,6,10,0,wood);box(-5,2,0,5,7,0,wood);box(0,8,0,0,13,0,metal);ring(0,13,0,2,metal);box(-2,13,0,2,13,0,metal);box(0,13,-2,0,13,2,metal);}
 else if(kind==='snowfigure'){sphere(0,4,0,3,cream);sphere(0,9,0,2,cream);box(-2,7,-2,2,7,2,cloth);box(1,6,3,1,7,3,cloth);put(-1,10,2,metal);put(1,10,2,metal);box(0,9,2,0,9,3,cloth);}
 else if(kind==='shower'){box(-4,1,-4,4,1,4,stone);box(0,2,-3,0,16,-3,wood);box(0,16,-3,0,16,1,metal);box(-1,15,0,1,15,2,metal);box(-1,7,-2,1,7,-2,metal);}
 else throw Error(`Unknown premium recipe ${kind}`);
 const cells=[...map.values()],xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
 return{...spec,cells,bounds:{x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)},seat};
}
