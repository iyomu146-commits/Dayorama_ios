import {voxelize} from './design.mjs';
self.onmessage=e=>{try{self.postMessage({cells:voxelize(e.data)});}catch(error){self.postMessage({error:error.message});}};
