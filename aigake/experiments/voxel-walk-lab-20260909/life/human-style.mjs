// Identity and work clothes are independent of the region's weather layers.
export function humanStyle({region='grove',role='resident',variant=0,gender=variant%2?'woman':'man',age='adult'}={}){
 const child=age==='child',cold=['snow','alpine','stars'].includes(region),hot=['oasis','tropical'].includes(region);
 const base={gender,age,apron:false,hat:null,shirt:'#a66f60',pants:'#64717a',trim:'#d2b891',hairStyle:gender==='woman'?(variant%3?'ponytail':'bob'):'short',hair:['#554b40','#82614a','#403e3b'][variant%3],collar:true};
 const uniforms={
  baker:{shirt:'#e8ddc4',pants:'#78685c',trim:'#b38b63',apron:true,hat:'baker',longSleeves:true},
  cafe:{shirt:'#547e91',pants:'#535f6c',trim:'#d6b18b',apron:true,longSleeves:true,hairStyle:gender==='woman'?'ponytail':'sidepart'},
  gardener:{shirt:'#b39a59',pants:'#687f66',trim:'#d6bd86',overalls:true,hat:'sun',boots:true,longSleeves:true},
  resident:{shirt:'#b87560',pants:'#687481',trim:'#e4cfb0',cardigan:true},
  visitor:{shirt:gender==='woman'?'#b87b83':'#6687a2',pants:'#666d79',trim:'#d3ba91',cardigan:gender==='woman',vest:gender==='man',skirt:gender==='woman'&&variant%3===0},
  reader:{shirt:'#9c786f',pants:'#647b72',trim:'#dac8a9',cardigan:true,hairStyle:gender==='woman'?'bob':'sidepart'},
 };
 const result={...base,...uniforms[role],role};
 if(child)Object.assign(result,{age:'child',role:'child',shirt:variant%2?'#c7a651':'#769f92',pants:'#727d9b',trim:'#b57961',hat:cold?'knit':variant%2?'cap':null,hatColor:'#b57662',hairStyle:gender==='woman'?'pigtails':'short',apron:false,overalls:false,vest:false,cardigan:false,collar:false,skirt:false,shorts:!cold,backpack:true});
 if(cold)Object.assign(result,{coat:true,longSleeves:true,shorts:false,boots:true,scarf:true,gloves:true,hat:role==='baker'&&!child?'baker':'knit'});
 else if(hot){result.longSleeves=region==='oasis';if(!['baker','cafe'].includes(role)&&!child)result.hat='sun';if(region==='tropical'&&!['baker','cafe','gardener'].includes(role))Object.assign(result,{shorts:true,sandals:true,skirt:false});}
 else if(region==='harbor')Object.assign(result,{longSleeves:true,boots:true});
 else if(region==='tokyo'&&role==='visitor'&&!child)Object.assign(result,{tie:true,collar:true,longSleeves:true});
 return result;
}
