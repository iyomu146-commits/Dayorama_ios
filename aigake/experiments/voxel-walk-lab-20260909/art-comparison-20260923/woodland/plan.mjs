// All dimensions are authored in the same 15 cm integer grid. Front is +Z.
export const CELL=.15;
export const BUILDINGS=[
 {id:'home',name:'住宅',x:-53,z:-32,w:32,d:27,h:44,roof:'gable',wall:'sage',upper:'plaster',tiles:'blueRoof',door:[4,10],windows:[[-12,-3,9,19],[-12,-3,29,39],[4,12,29,39]]},
 {id:'bakery',name:'パン屋',x:0,z:-34,w:32,d:27,h:24,roof:'gable',wall:'brick',tiles:'redRoof',door:[2,8],windows:[[-13,-3,9,19]]},
 {id:'books',name:'本屋',x:55,z:-40,w:34,d:29,h:29,roof:'hip',wall:'indigo',tiles:'plumRoof',door:[7,13],windows:[[-13,3,9,22]]},
 {id:'florist',name:'花屋',x:-38,z:29,w:30,d:26,h:25,roof:'gable',wall:'ochre',tiles:'oliveRoof',door:[5,11],windows:[[-12,1,9,20]]},
 {id:'cafe',name:'喫茶店',x:35,z:32,w:32,d:27,h:25,roof:'gable',wall:'plaster',tiles:'tealRoof',door:[5,11],windows:[[-13,1,9,20]]},
];
export const FAMILIES={
 plaster:['#ded0ac','#cdbd98','#d3bd99','#bdb69b','#e7dbbd'],
 sage:['#879575','#9fa782','#acaf91','#738570','#b3b596'],
 ochre:['#ce9b56','#bd8d51','#d9ad67','#cba374','#dcbf80'],
 brick:['#a9603f','#c87c4d','#98543c','#b86c45','#ce9265'],
 indigo:['#48637a','#587182','#3d5368','#637883','#6c8491'],
 blueRoof:['#34566b','#406277','#506e7e','#658494','#344957'],
 redRoof:['#974c2d','#b15e35','#a9603f','#bc7951','#7f442e'],
 plumRoof:['#584d61','#6c5c71','#7c6b7b','#615869','#514654'],
 oliveRoof:['#646c35','#7a8245','#818950','#525b31','#90935b'],
 tealRoof:['#295b61','#3c6d70','#718169','#557774','#244c50'],
 wood:['#9d6637','#b47c43','#bd9055','#815532','#98643c'],
 stone:['#c4baa0','#d3c6aa','#b6b29f','#d9ceb5','#c0b393'],
 leaf:['#63852e','#72903a','#819944','#4e702b','#8a9f46'],
 grass:['#8a9d51','#93a65a','#a4b268','#84994e','#98aa59'],
 soil:['#805334','#9b673d','#b37b46','#947047','#ac8150'],
 glass:['#54847f','#6a9991','#86aea2','#3e6d6b','#a8c4b0'],
 flower:['#d47885','#e4bb48','#c8cae0','#b197d0','#e6d8be'],
 cream:['#e1d4b2','#d5c5a1','#e7dcbd'],
 water:['#469bbd','#54a8c7','#68b6cd','#347fa3'],
 metal:['#434e4b','#58625b','#737968'],
};
export const PALETTE=Object.fromEntries(Object.entries(FAMILIES).flatMap(([f,colors])=>colors.map((c,i)=>[`${f}${i}`,c])));
export const ROUGHNESS=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,k.startsWith('glass')?.25:k.includes('Roof')?.65:k.startsWith('wood')?.78:k.startsWith('metal')?.58:k.startsWith('water')?.28:.94]));
export const TREES=[[-85,-35,0],[-13,-76,1],[29,-76,2],[88,-41,3],[-64,-76,4]];
export const PARTS=[
 ...BUILDINGS.flatMap(b=>[
  {id:`${b.id}-base`,asset:b.id,level:'meso',name:'基礎と上がり口',feature:'Aligned paving, two supported entrance treads',size:[b.w+8,4,b.d+9]},
  {id:`${b.id}-frame`,asset:b.id,level:'meso',name:'柱・梁',feature:'Corner posts, connected ring beams and stepwise rafters',size:[b.w,b.h,b.d]},
  {id:`${b.id}-walls`,asset:b.id,level:'meso',name:'壁',feature:`${b.wall} perimeter shell, recessed openings and coherent repair patches`,size:[b.w,b.h,b.d]},
  {id:`${b.id}-openings`,asset:b.id,level:'micro',name:'窓と扉',feature:'Uninterrupted glazing, perimeter frame, recessed panel door; upstairs railings on home',size:[b.w,b.h,b.d+2]},
  {id:`${b.id}-roof`,asset:b.id,level:'meso',name:'屋根',feature:`${b.tiles} closed ${b.roof} shell, staggered tile courses, restrained repaired tile clusters`,size:[b.w+6,14,b.d+6]},
  {id:`${b.id}-details`,asset:b.id,level:'micro',name:'店先・庭',feature:({home:'Roofed entrance, chimney, small garden fence',bakery:'Low side annex, canvas awning, trays and scored loaves',books:'Visible books behind an unbroken pane, bench with grounded legs',florist:'Low greenhouse bay, staggered terracotta pots with separate petals and centres',cafe:'Striped canopy, side table and two four-legged chairs'})[b.id],size:[b.w+24,25,b.d+12]},
 ]),
 ...TREES.map((_,i)=>({id:`tree-${i}`,asset:'tree',level:'meso',name:i===2?'白樺':'広葉樹',feature:'Irregular lobed crown, visible connected branches and tapered grounded trunk',size:[24,49,22]})),
 {id:'terrain',asset:'town',level:'macro',name:'地面・通路',feature:'Shallow irregular soil island and connected level paving',size:[178,6,157]},
 {id:'stream',asset:'town',level:'meso',name:'水路',feature:'Narrow continuous blue water course along front edge, stone banks',size:[173,3,10]},
 {id:'bridge',asset:'bridge',level:'meso',name:'橋',feature:'Wood deck spanning both banks with attached posts and railings',size:[17,10,22]},
 {id:'garden',asset:'flowers',level:'micro',name:'植栽',feature:'Spaced flower clumps with distinct centres; few mushrooms only beside trunks',size:[165,7,145]},
 {id:'street',asset:'bench',level:'micro',name:'街灯・ベンチ',feature:'Three lanterns off the paths and independent grounded bench legs',size:[170,21,140]},
];
