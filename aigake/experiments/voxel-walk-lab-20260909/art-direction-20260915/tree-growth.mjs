const clamp=value=>Math.max(0,Math.min(1,value));

// One tree grows at a time. Leave the end of the town's construction for the
// completed landscape, and keep the same order when replaying or reopening.
export function scheduleTreeGrowth(trees){
 trees.forEach((tree,index)=>{
  tree.birth=index/trees.length*.96;
  tree.mature=(index+1)/trees.length*.96;
 });
}

export function treeGrowth(tree,townProgress){
 const end=tree.mature??tree.birth;
 const progress=end>tree.birth?clamp((townProgress-tree.birth)/(end-tree.birth)):Number(townProgress>=tree.birth);
 // Young trees gain height before spreading their branches. A single transform
 // keeps the trunk, branches and leaves joined, including their wind and shadow.
 return{progress,height:progress>=.7-1e-9?1:Math.sqrt(progress/.7),width:progress**1.1};
}
