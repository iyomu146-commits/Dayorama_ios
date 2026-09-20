import {BY_ID} from './catalog.mjs';
import {GROVE_IDS,groveBlueprint} from './grove.mjs';
import {HARBOR_IDS,harborBlueprint} from './harbor.mjs';
import {CANAL_IDS,canalBlueprint} from './canal.mjs';
import {MEADOW_IDS,meadowBlueprint} from './meadow.mjs';
import {ALPINE_IDS,alpineBlueprint} from './alpine.mjs';
import {SATOYAMA_IDS,satoyamaBlueprint} from './satoyama.mjs';
import {OASIS_IDS,oasisBlueprint} from './oasis.mjs';
import {SNOW_IDS,snowBlueprint} from './snow.mjs';
import {STARS_IDS,starsBlueprint} from './stars.mjs';
import {TROPICAL_IDS,tropicalBlueprint} from './tropical.mjs';
import {TOKYO_IDS,tokyoBlueprint} from './tokyo.mjs';
import {observatoryBlueprint} from '../observatory.mjs';
import {lighthouseBlueprint} from '../lighthouse.mjs';

export const IMPLEMENTED_IDS=[...GROVE_IDS,...HARBOR_IDS,...CANAL_IDS,...MEADOW_IDS,...ALPINE_IDS,...SATOYAMA_IDS,...OASIS_IDS,...SNOW_IDS,...STARS_IDS,...TROPICAL_IDS,'lighthouse','observatory',...TOKYO_IDS];
export const availableBuildings=region=>IMPLEMENTED_IDS.filter(id=>BY_ID[id].region===region&&!BY_ID[id].journey);
export const AVAILABLE_REGIONS=[...new Set(IMPLEMENTED_IDS.filter(id=>!BY_ID[id].journey).map(id=>BY_ID[id].region))];
export function contentBlueprint(id,seed=41){
  if(!BY_ID[id])throw Error('Unknown building: '+id);
  if(GROVE_IDS.includes(id))return groveBlueprint(id,seed);
  if(HARBOR_IDS.includes(id))return harborBlueprint(id,seed);
  if(CANAL_IDS.includes(id))return canalBlueprint(id,seed);
  if(MEADOW_IDS.includes(id))return meadowBlueprint(id,seed);
  if(ALPINE_IDS.includes(id))return alpineBlueprint(id,seed);
  if(SATOYAMA_IDS.includes(id))return satoyamaBlueprint(id,seed);
  if(OASIS_IDS.includes(id))return oasisBlueprint(id,seed);
  if(SNOW_IDS.includes(id))return snowBlueprint(id,seed);
  if(STARS_IDS.includes(id))return starsBlueprint(id,seed);
  if(TROPICAL_IDS.includes(id))return tropicalBlueprint(id,seed);
  if(TOKYO_IDS.includes(id))return tokyoBlueprint(id,seed);
  if(id==='lighthouse')return{...lighthouseBlueprint(seed),id};
  if(id==='observatory')return{...observatoryBlueprint(seed),id};
  throw Error('Building is not authored yet: '+id);
}
