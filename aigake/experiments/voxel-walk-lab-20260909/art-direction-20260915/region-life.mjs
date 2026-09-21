import {humanStyle} from '../life/human-style.mjs';
// Share the editor's identities and work outfits with the walking app.
const W={
 grove:{shirt:'#688773',pants:'#706b5c',trim:'#c4a373',longSleeves:true,apron:true,hat:null},
 harbor:{shirt:'#b5954c',pants:'#516b7a',trim:'#e3cf92',coat:true,longSleeves:true,boots:true,hat:'cap',apron:false},
 canal:{shirt:'#7c8795',pants:'#625e60',trim:'#b48165',coat:true,longSleeves:true,hat:'cap',apron:false},
 meadow:{shirt:'#ba9c6b',pants:'#6b8293',trim:'#d7bb7c',overalls:true,boots:true,hat:'sun',apron:false},
 alpine:{shirt:'#9c6852',pants:'#636c70',trim:'#c2ae8a',longSleeves:true,coat:true,boots:true,hat:'knit',backpack:true,apron:false},
 satoyama:{shirt:'#4d6b87',pants:'#566376',trim:'#cbb687',longSleeves:true,boots:true,hat:'sun',apron:false},
 oasis:{shirt:'#e1cfaa',pants:'#aa9272',trim:'#7f9893',coat:true,longSleeves:true,hat:'sun',apron:false},
 snow:{shirt:'#9e6059',pants:'#566b7c',trim:'#d8b97a',coat:true,longSleeves:true,scarf:true,gloves:true,boots:true,hat:'knit',apron:false},
 stars:{shirt:'#586f8a',pants:'#596473',trim:'#c3a176',coat:true,longSleeves:true,scarf:true,hat:'knit',apron:false},
 tropical:{shirt:'#6fa3a0',pants:'#c6a67b',trim:'#ddbd77',shorts:true,sandals:true,hat:'sun',apron:false},
 tokyo:{shirt:'#536a7a',pants:'#505b68',trim:'#a17260',tie:true,longSleeves:true,hat:null,apron:false},
};
const worker=(kind,label,item,action,change={})=>({kind,label,item,action,change});
const animal=(type,kind,mode='land',count=1)=>({type,kind,mode,count});
export const REGION_LIFE={
 grove:{clothes:'カーディガン・エプロン',workers:[worker('books','本屋の店主','book','read'),worker('flowers','花の手入れ','can','water',{shirt:'#839065'}),worker('tea','喫茶の店員','cup','serve',{shirt:'#a58065'}),worker('bakery','パン職人','basket','work')],animals:[animal('cat','books'),animal('bird','mushroom-house'),animal('butterfly','flowers','air',2)]},
 harbor:{clothes:'作業着・長靴・帽子',workers:[worker('fish-market','市場の荷運び','basket','work'),worker('net-loft','倉庫の作業','parcel','work',{shirt:'#5b7b8a'}),worker('harbor-inn','宿の店員','cup','serve',{shirt:'#9e735a'})],animals:[animal('gull','fish-market','sea-air',2),animal('cat','net-loft')]},
 canal:{clothes:'コート・配達用の帽子',workers:[worker('post-office','郵便の配達','parcel','work'),worker('clockmaker','時計店の店主','book','read',{shirt:'#98856c',hat:null}),worker('canal-home','散歩する住人',null,'idle',{shirt:'#ab827c'})],animals:[animal('duck','canal-home','water',2),animal('cat','antique-shop')]},
 meadow:{clothes:'オーバーオール・日除け帽',workers:[worker('barn','羊の世話','basket','care'),worker('farmhouse','畑の手入れ','can','water',{shirt:'#849566'}),worker('dairy','乳製品の運搬','parcel','work',{shirt:'#b1866a'})],animals:[animal('sheep','barn','pen',2),animal('dog','farmhouse')]},
 alpine:{clothes:'上着・登山靴・リュック',workers:[worker('mountain-lodge','薪の運搬','firewood','work'),worker('cheese-cellar','ヤギの世話','basket','care',{shirt:'#82916b',backpack:false}),worker('trail-refuge','登山の休憩',null,'observe',{shirt:'#6b8498'})],animals:[animal('goat','cheese-cellar','pen',2),animal('bird','trail-refuge')]},
 satoyama:{clothes:'作業着・麦わら帽・長靴',workers:[worker('rice-granary','米の運搬','parcel','work'),worker('paper-workshop','和紙の確認','book','read',{hat:null,shirt:'#899b91'}),worker('noodle-shop','店先の接客','cup','serve',{hat:null,apron:true,shirt:'#95775d'})],animals:[animal('cat','ryokan'),animal('bird','rice-granary','land',2)]},
 oasis:{clothes:'薄手の長袖・日除け帽',workers:[worker('date-market','市場の品出し','basket','work'),worker('caravanserai','ヤギの世話','can','care',{shirt:'#b7c7bb'}),worker('carpet-weaver','工房の荷運び','parcel','work',{shirt:'#c79d82'})],animals:[animal('camel','caravanserai'),animal('goat','caravanserai','pen',2),animal('bird','date-market')]},
 snow:{clothes:'防寒着・ニット帽・手袋・ブーツ',workers:[worker('sled-workshop','道の雪かき','shovel','shovel'),worker('sauna','薪の運搬','firewood','work',{shirt:'#648795',trim:'#d0bc93'}),worker('reindeer-stable','トナカイの世話','basket','care',{shirt:'#829578',trim:'#d9c9ab'})],animals:[animal('reindeer','reindeer-stable','pen',2)]},
 stars:{clothes:'夜間の上着・マフラー',workers:[worker('observatory','空の観測',null,'observe'),worker('star-map-library','星図の確認','book','read',{shirt:'#93786f'}),worker('meteorite-lab','記録の確認','book','read',{shirt:'#7f958c'})],animals:[animal('owl','observatory','perch'),animal('cat','star-map-library')]},
 tropical:{clothes:'半袖・短パン・サンダル',workers:[worker('fruit-bar','果物の運搬','basket','work'),worker('palm-weaver','工房の作業','basket','work',{shirt:'#c79678'}),worker('surf-school','海辺の休憩','cup','serve',{shirt:'#9dab6c'})],animals:[animal('turtle','surf-school','water',2),animal('gull','surf-school','sea-air')]},
 tokyo:{clothes:'ジャケット・シャツ・配達用の上着',workers:[worker('tokyo-kaminarimon','雷門を訪れた人',null,'observe',{shirt:'#ba856c',tie:false}),worker('tokyo-temple','参拝する人',null,'idle',{shirt:'#8c9d90',tie:false}),worker('tokyo-highrise','駅前を歩く人','book','read'),worker('tokyo-station','駅の係員',null,'inspect',{shirt:'#3f586b',hat:'cap',tie:true}),worker('tokyo-shop','参道の店への配達','parcel','work',{shirt:'#b78858',tie:false,hat:'cap'}),worker('tokyo-office','通勤する人','book','read'),worker('tokyo-brick-station','駅前で待つ人',null,'idle',{shirt:'#927868',tie:false}),worker('tokyo-residence','買い物をする人','basket','carry',{shirt:'#799585',tie:false})],animals:[animal('pigeon','tokyo-temple','land',2),animal('pigeon','tokyo-station','land',3),animal('cat','tokyo-shop'),animal('pigeon','tokyo-brick-station','land',2),animal('cat','tokyo-residence')]},
};
export function regionalWorkers(id){return REGION_LIFE[id].workers.map((w,i)=>{
 const role=w.kind==='bakery'?'baker':w.action==='water'?'gardener':w.action==='serve'?'cafe':w.action==='read'?'reader':'resident';
 const style=humanStyle({region:id,role,variant:i,gender:i%2?'man':'woman'});
 return{...w,appearance:{...W[id],...style,...w.change,regional:true},workSeconds:w.action==='idle'?3:7};
});}
export function regionalFamily(id,seed){
 return[
  {label:'散歩する住人',appearance:humanStyle({region:id,role:'visitor',variant:0,gender:'woman'})},
  {label:'子供',appearance:humanStyle({region:id,role:'child',variant:1,gender:seed%2?'man':'woman',age:'child'})}
 ].map(p=>({...p,action:'idle',workSeconds:3,phase:0}));
}
