// Color placement belongs to this cafe; not a random common building palette.
export const PALETTE={
 clay:'#b7b5a6',plaster:'#e5d5ad',plasterLight:'#eee0bd',plasterWarm:'#d9c59d',repair:'#c8b18a',repairPink:'#cb9471',
 mortar:'#98765c',brick:'#ad6c49',brickLight:'#c08459',brickDark:'#975d41',brickWarm:'#b97852',
 stone:'#cbbfa1',stoneLight:'#ddd2b4',stoneShade:'#bbae91',
 wood:'#a57637',woodLight:'#c3934c',woodDark:'#80592d',woodPanel:'#b1813a',woodEdge:'#a67335',
 slate:'#35696a',slate2:'#3b7473',slateMuted:'#426f70',slateDark:'#285355',slateEdge:'#294f52',slateSage:'#648474',slateSage2:'#708d79',slatePatina:'#4c7774',slateSagePatina:'#799282',
 glass:'#4c746e',glassDeep:'#3c625f',glassMid:'#567f76',glassPale:'#638e80',
 cloth:'#c47d55',clothLight:'#df9c63',ivory:'#eee3c3',pot:'#b7794b',potLight:'#ce905b',soil:'#68563c',soot:'#3a332d',
 leaf:'#4f792f',leafLight:'#7b983d',leafDark:'#42672d',pink:'#d9a496',pinkLight:'#ecc2b1',cream:'#eddeb8',metal:'#514e3d',coffee:'#69543b'
};
export const roughness=id=>id.startsWith('glass')?.34:id.startsWith('slate')?.75:id.startsWith('wood')?.82:.94;
export const PART_NAMES={plinth:'石と煉瓦の基礎',walls:'漆喰の壁',gable:'妻壁',fascia:'軒下の木部',roof:'瓦の下地',tiles:'瓦',ridge:'棟',chimney:'煙突', 'front-window':'正面の窓','side-window':'側面の窓',door:'扉',handle:'取手',awning:'庇',steps:'入口の石段',terrace:'舗装',table:'テーブル','chair-front':'手前の椅子','chair-back':'奥の椅子',cup:'カップ','plant-left':'左の鉢','plant-front':'入口の花','plant-right':'テラスの鉢'};
