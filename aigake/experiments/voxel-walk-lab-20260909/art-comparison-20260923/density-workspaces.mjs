import {cellKey} from './design.mjs';
import {editBox,makeTimeline,workbenchBounds} from './density-core.mjs';
// Scratch work and the sample each keep an independent model and undo stack at both sizes.
export class DensityWorkspaces{
 constructor(){this.states=new Map();}
 key(scope,factor){if(!['blank','building','district'].includes(scope)||![1,2].includes(factor))throw Error('作業台の設定が不正です');return `${scope==='blank'?'blank':'sample'}:${factor}`;}
 has(scope,factor){return this.states.has(this.key(scope,factor));}
 get(scope,factor){const key=this.key(scope,factor);if(!this.states.has(key))this.replace(scope,factor,new Map());return this.states.get(key);}
 replace(scope,factor,map){const state={map,timeline:makeTimeline([...map.values()]),history:[]};this.states.set(this.key(scope,factor),state);return state;}
 install(scope,factor,cells){if(!this.has(scope,factor))this.replace(scope,factor,new Map(cells.map(c=>[cellKey(c),c])));}
 remember(state,patch){if(!patch.length)return;state.history.push(patch);if(state.history.length>30)state.history.shift();state.timeline=makeTimeline([...state.map.values()]);}
 edit(scope,factor,command){if(scope==='district')throw Error('編集画面で操作してください');const state=this.get(scope,factor),result=editBox(state.map,{...command,bounds:scope==='blank'?workbenchBounds(factor):null});state.map=result.map;this.remember(state,result.patch);return result.patch.length;}
 clear(scope,factor){if(scope!=='blank')throw Error('空にできるのは自由な作業台だけです');const state=this.get(scope,factor),patch=[...state.map].map(([key,old])=>({key,old}));state.map=new Map();this.remember(state,patch);return patch.length;}
 undo(scope,factor){const state=this.get(scope,factor),patch=state.history.pop();if(!patch)return 0;for(const {key,old} of patch)old?state.map.set(key,old):state.map.delete(key);state.timeline=makeTimeline([...state.map.values()]);return patch.length;}
}
